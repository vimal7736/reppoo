import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendSubscriptionChangedEmail } from "@/lib/email";
import { randomUUID } from "node:crypto";

type WebhookStatus = "pending" | "success" | "failed" | "ignored";

async function notifyOrgOfPlanChange(orgId: string, newTier: string) {
  const supabase = createAdminClient();
  const { data: org } = await supabase
    .from("organisations")
    .select("name")
    .eq("id", orgId)
    .single();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("org_id", orgId);

  if (!profiles || profiles.length === 0) return;

  const emailSet = new Set<string>();

  for (const profile of profiles) {
    if (profile.email) {
      emailSet.add(profile.email);
    }
  }

  const missingEmailProfiles = profiles.filter((profile) => !profile.email);
  if (missingEmailProfiles.length > 0) {
    const authUsers = await Promise.all(
      missingEmailProfiles.map(async (profile) => {
        const { data } = await supabase.auth.admin.getUserById(profile.id);
        return data.user?.email ?? null;
      })
    );

    for (const email of authUsers) {
      if (email) emailSet.add(email);
    }
  }

  await Promise.all(
    Array.from(emailSet).map((email) =>
      sendSubscriptionChangedEmail({
        to: email,
        orgName: org?.name ?? "Your Organisation",
        newTier,
      })
    )
  );
}

function notifyOrgOfPlanChangeAsync(orgId: string, newTier: string) {
  void notifyOrgOfPlanChange(orgId, newTier).catch((error) => {
    console.error("[stripe-webhook] failed to notify org of plan change", error);
  });
}

function summariseStripeEvent(event: any, orgName?: string | null) {
  const name = orgName ? `'${orgName}'` : "unknown org";
  switch (event.type) {
    case "checkout.session.completed":
      return `Checkout completed for ${name}`;
    case "customer.subscription.updated":
      return `Subscription updated for ${name}`;
    case "customer.subscription.deleted":
      return `Subscription canceled for ${name}`;
    default:
      return `Received ${event.type} for ${name}`;
  }
}

async function upsertWebhookLog(
  supabase: ReturnType<typeof createAdminClient>,
  event: any,
  updates: {
    status: WebhookStatus;
    http_status?: number;
    org_id?: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    checkout_session_id?: string | null;
    payload_summary?: string | null;
    error_message?: string | null;
    processed_at?: string | null;
  }
) {
  const stripeCustomerId =
    typeof event.data?.object?.customer === "string" ? event.data.object.customer : null;
  const stripeSubscriptionId =
    typeof event.data?.object?.subscription === "string"
      ? event.data.object.subscription
      : typeof event.data?.object?.id === "string" && String(event.type).startsWith("customer.subscription")
        ? event.data.object.id
        : null;
  const checkoutSessionId =
    typeof event.data?.object?.id === "string" && event.type === "checkout.session.completed"
      ? event.data.object.id
      : null;

  const { data: existing } = await supabase
    .from("webhook_logs")
    .select("id, attempt_count")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (!event?.id || !event?.type) {
    throw new Error("Webhook log requires a Stripe event with id and type");
  }

  const payload = {
    provider: "stripe",
    stripe_event_id: event.id,
    event_type: event.type,
    livemode: Boolean(event.livemode),
    status: updates.status,
    http_status: updates.http_status ?? null,
    attempt_count: (existing?.attempt_count ?? 0) + 1,
    org_id: updates.org_id ?? null,
    stripe_customer_id: updates.stripe_customer_id ?? stripeCustomerId,
    stripe_subscription_id: updates.stripe_subscription_id ?? stripeSubscriptionId,
    checkout_session_id: updates.checkout_session_id ?? checkoutSessionId,
    payload_summary: updates.payload_summary ?? null,
    error_message: updates.error_message ?? null,
    payload: event,
    received_at: existing ? undefined : new Date().toISOString(),
    processed_at: updates.processed_at ?? null,
  };

  if (existing?.id) {
    const { received_at, ...updatePayload } = payload;
    const { error } = await supabase.from("webhook_logs").update(updatePayload).eq("id", existing.id);
    if (error) {
      throw new Error(`Failed to update webhook log: ${error.message}`);
    }
    return;
  }

  const { error } = await supabase.from("webhook_logs").insert(payload);
  if (error) {
    throw new Error(`Failed to insert webhook log: ${error.message}`);
  }
}

async function insertWebhookFailureLog(
  supabase: ReturnType<typeof createAdminClient>,
  params: {
    eventType: string;
    summary: string;
    errorMessage: string;
    rawBody: string;
    signaturePresent: boolean;
  }
) {
  const syntheticEventId = `invalid_${Date.now()}_${randomUUID()}`;
  const { error } = await supabase.from("webhook_logs").insert({
    provider: "stripe",
    stripe_event_id: syntheticEventId,
    event_type: params.eventType,
    livemode: false,
    status: "failed",
    http_status: 400,
    attempt_count: 1,
    payload_summary: params.summary,
    error_message: params.errorMessage,
    payload: {
      raw_body: params.rawBody,
      signature_present: params.signaturePresent,
    },
    processed_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to insert invalid webhook log: ${error.message}`);
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const supabase = createAdminClient();

  if (!sig) {
    try {
      await insertWebhookFailureLog(supabase, {
        eventType: "missing_signature",
        summary: "Rejected Stripe webhook without signature",
        errorMessage: "No stripe-signature header",
        rawBody: body,
        signaturePresent: false,
      });
    } catch (logErr) {
      console.error("[stripe-webhook] failed to log missing signature", logErr);
    }
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    try {
      await insertWebhookFailureLog(supabase, {
        eventType: "invalid_signature",
        summary: "Rejected Stripe webhook with invalid signature",
        errorMessage: err instanceof Error ? err.message : "Invalid webhook signature",
        rawBody: body,
        signaturePresent: true,
      });
    } catch (logErr) {
      console.error("[stripe-webhook] failed to log invalid signature", logErr);
    }
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  try {
    const { data: existingLog } = await supabase
      .from("webhook_logs")
      .select("status, processed_at, payload_summary")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existingLog?.status === "success" || existingLog?.status === "ignored") {
      await upsertWebhookLog(supabase, event, {
        status: existingLog.status,
        http_status: 200,
        payload_summary: `${existingLog.payload_summary ?? summariseStripeEvent(event)} (duplicate delivery ignored)`,
        processed_at: existingLog.processed_at ?? new Date().toISOString(),
      });

      return NextResponse.json({ received: true, duplicate: true });
    }

    await upsertWebhookLog(supabase, event, {
      status: "pending",
      http_status: 202,
      payload_summary: `Received ${event.type}`,
    });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const orgId = session.metadata?.org_id;
        const plan = session.metadata?.plan;
        const subscriptionId = session.subscription as string;

        if (!orgId || !plan) {
          await upsertWebhookLog(supabase, event, {
            status: "ignored",
            http_status: 200,
            payload_summary: "Ignored checkout.session.completed without org metadata",
            processed_at: new Date().toISOString(),
          });
          break;
        }

        const seatsMap:    Record<string, number> = { free: 1,  starter: 3,  business: 8    };
        const billsMap:    Record<string, number> = { free: 1,  starter: 50, business: 500  };
        const aiTipsMap:   Record<string, number> = { free: 0,  starter: 20, business: 100  };
        const pdfMap:      Record<string, number> = { free: 1,  starter: 5,  business: 9999 };

        const { data: org } = await supabase
          .from("organisations")
          .select("name")
          .eq("id", orgId)
          .single();

        const { error } = await supabase
          .from("organisations")
          .update({
            tier: plan,
            stripe_subscription_id: subscriptionId,
            seats_limit:        seatsMap[plan]  ?? 1,
            bills_limit:        billsMap[plan]  ?? 1,
            ai_tips_limit:      aiTipsMap[plan] ?? 0,
            ai_tips_used:       0,
            pdf_reports_limit:  pdfMap[plan]    ?? 1,
            pdf_reports_used:   0,
            usage_reset_at:     new Date().toISOString(),
          })
          .eq("id", orgId);

        if (error) throw new Error(`DB update failed for checkout.session.completed: ${error.message}`);

        await upsertWebhookLog(supabase, event, {
          status: "success",
          http_status: 200,
          org_id: orgId,
          stripe_subscription_id: subscriptionId,
          payload_summary: `Org ${org?.name ? `'${org.name}'` : `'${orgId}'`} upgraded to ${plan}`,
          processed_at: new Date().toISOString(),
        });
        
        // Notify of change
        notifyOrgOfPlanChangeAsync(orgId, plan);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = sub.customer as string;

        const { data: org, error: fetchError } = await supabase
          .from("organisations")
          .select("id, name")
          .eq("stripe_customer_id", customerId)
          .single();

        if (fetchError) throw new Error(`Org lookup failed: ${fetchError.message}`);
        if (!org) {
          await upsertWebhookLog(supabase, event, {
            status: "ignored",
            http_status: 200,
            stripe_customer_id: customerId,
            payload_summary: `Ignored ${event.type} for unknown Stripe customer`,
            processed_at: new Date().toISOString(),
          });
          break;
        }

        const priceId = sub.items.data[0]?.price?.id;
        let tier = "free";
        if (priceId === process.env.STRIPE_STARTER_PRICE_ID) tier = "starter";
        if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) tier = "business";

        const seatsMap:    Record<string, number> = { free: 1,  starter: 3,  business: 8    };
        const billsMap:    Record<string, number> = { free: 1,  starter: 50, business: 500  };
        const aiTipsMap:   Record<string, number> = { free: 0,  starter: 20, business: 100  };
        const pdfMap:      Record<string, number> = { free: 1,  starter: 5,  business: 9999 };

        const { error: updateError } = await supabase
          .from("organisations")
          .update({
            tier,
            seats_limit:       seatsMap[tier]  ?? 1,
            bills_limit:       billsMap[tier]  ?? 1,
            ai_tips_limit:     aiTipsMap[tier] ?? 0,
            ai_tips_used:      0,
            pdf_reports_limit: pdfMap[tier]    ?? 1,
            pdf_reports_used:  0,
            usage_reset_at:    new Date().toISOString(),
          })
          .eq("id", org.id);

        if (updateError) throw new Error(`DB update failed for subscription.updated: ${updateError.message}`);

        await upsertWebhookLog(supabase, event, {
          status: "success",
          http_status: 200,
          org_id: org.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id as string,
          payload_summary: `Org '${org.name}' changed subscription to ${tier}`,
          processed_at: new Date().toISOString(),
        });
        
        // Notify of change
        notifyOrgOfPlanChangeAsync(org.id, tier);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = sub.customer as string;

        const { data: org, error: fetchError } = await supabase
          .from("organisations")
          .select("id, name")
          .eq("stripe_customer_id", customerId)
          .single();

        if (fetchError) throw new Error(`Org lookup failed: ${fetchError.message}`);
        if (!org) {
          await upsertWebhookLog(supabase, event, {
            status: "ignored",
            http_status: 200,
            stripe_customer_id: customerId,
            payload_summary: `Ignored ${event.type} for unknown Stripe customer`,
            processed_at: new Date().toISOString(),
          });
          break;
        }

        const { error: updateError } = await supabase
          .from("organisations")
          .update({
            tier: "free",
            stripe_subscription_id: null,
            seats_limit:       1,
            bills_limit:       1,
            ai_tips_limit:     0,
            ai_tips_used:      0,
            pdf_reports_limit: 1,
            pdf_reports_used:  0,
            usage_reset_at:    new Date().toISOString(),
          })
          .eq("id", org.id);

        if (updateError) throw new Error(`DB update failed for subscription.deleted: ${updateError.message}`);

        await upsertWebhookLog(supabase, event, {
          status: "success",
          http_status: 200,
          org_id: org.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id as string,
          payload_summary: `Org '${org.name}' downgraded to Free`,
          processed_at: new Date().toISOString(),
        });
        
        // Notify of downgrade to free
        notifyOrgOfPlanChangeAsync(org.id, "free");
        break;
      }
      default: {
        await upsertWebhookLog(supabase, event, {
          status: "ignored",
          http_status: 200,
          payload_summary: summariseStripeEvent(event),
          processed_at: new Date().toISOString(),
        });
        break;
      }
    }
  } catch (err) {
    console.error("[stripe-webhook]", err);
    try {
      await upsertWebhookLog(supabase, event, {
        status: "failed",
        http_status: 500,
        payload_summary: summariseStripeEvent(event),
        error_message: err instanceof Error ? err.message : "Webhook processing failed",
        processed_at: new Date().toISOString(),
      });
    } catch (logErr) {
      console.error("[stripe-webhook] failed to write webhook log", logErr);
    }
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
