import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://greentrackai.com";

  if (!sessionId) {
    return NextResponse.redirect(`${appUrl}/billing`);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.redirect(`${appUrl}/billing?cancelled=1`);
    }
  } catch (err) {
    console.error("[billing/success]", err);
    return NextResponse.redirect(`${appUrl}/billing?cancelled=1`);
  }

  return NextResponse.redirect(`${appUrl}/billing?success=1`);
}
