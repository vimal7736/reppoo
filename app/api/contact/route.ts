import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM ?? '"GreenTrack AI" <noreply@greentrackai.com>';
const TO   = process.env.CONTACT_EMAIL ?? "support@greentrack.ai";

export async function POST(request: Request) {
  const { name, email, company, subject, message } = await request.json();

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (message.length > 1000 || name.length > 100 || email.length > 100 || (company && company.length > 100) || subject.length > 100) {
    return NextResponse.json({ error: "Input exceeds maximum allowed length" }, { status: 400 });
  }

  // Save ticket to Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch an admin/owner to assign the ticket to (bypasses NOT NULL constraint)
  const { data: adminUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "owner")
    .limit(1)
    .single();

  const fallbackUserId = adminUser?.id;

  let priority = "medium";
  const topicLower = subject.toLowerCase();
  if (topicLower.includes("bug") || topicLower.includes("secr") || topicLower.includes("enterprise")) priority = "high";
  else if (topicLower.includes("pricing") || topicLower.includes("compliance")) priority = "high";
  else if (topicLower.includes("feedback") || topicLower.includes("general") || topicLower.includes("other")) priority = "low";

  const { data: ticket, error: dbError } = await supabase
    .from("support_tickets")
    .insert({
      user_id: fallbackUserId,
      user_name: name,
      user_email: email,
      org_name: company || "Landing Page Inquiry",
      org_tier: "prospect",
      topic: subject,
      message,
      status: "open",
      priority,
    })
    .select("id")
    .single();

  if (dbError) {
    console.error("Failed to save support ticket:", dbError);
  }

  const ticketId = ticket?.id ? `#${ticket.id.slice(0, 8).toUpperCase()}` : "";

  try {
    await transporter.sendMail({
      from: FROM,
      to: TO,
      replyTo: `"${name}" <${email}>`,
      subject: `[Contact] ${ticketId ? ticketId + " — " : ""}${subject} — ${name}${company ? ` (${company})` : ""}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
          <div style="background:#14532d;padding:24px 32px;border-radius:12px 12px 0 0">
            <h1 style="color:#fff;margin:0;font-size:18px">New Contact Enquiry — GreenTrack AI</h1>
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
              ${[
                ["Ticket",  ticketId || "—"],
                ["Name",    name],
                ["Email",   email],
                ["Company", company || "—"],
                ["Topic",   subject],
              ].map(([k, v]) => `
                <tr>
                  <td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:700;width:100px;color:#374151">${k}</td>
                  <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#1a1a1a">${v}</td>
                </tr>`).join("")}
            </table>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#166534">Message</p>
              <p style="margin:0;font-size:14px;color:#1a1a1a;white-space:pre-wrap;line-height:1.6">${message}</p>
            </div>
            <p style="margin-top:24px;font-size:12px;color:#6b7280">
              Reply directly to this email to respond to ${name}.
            </p>
          </div>
          <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px">
            GreenTrack AI · Contact Form Submission
          </p>
        </div>`,
    });

    return NextResponse.json({ success: true, ticketId: ticket?.id ?? null });
  } catch (err) {
    console.error("Contact email failed:", err);
    if (ticket?.id) {
      return NextResponse.json({ success: true, ticketId: ticket.id, emailSent: false });
    }
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
