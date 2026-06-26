import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendDeactivationRequestEmail } from "@/lib/email";

export async function POST() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Prevent duplicate requests
  if (user.user_metadata?.deletion_requested) {
    return NextResponse.json(
      { error: "You have already sent a deletion request. Please wait while your request is processed." },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, organisations(name)")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const orgName = profile.organisations ? (profile.organisations as any).name : "Unknown Organisation";
  const userName = profile.full_name || "Unknown User";

  // Send request to system admin/support.
  // In a real app, this might be dynamically fetched or read from env.
  const adminEmail = process.env.SUPPORT_EMAIL || "support@greentrackai.com";

  await sendDeactivationRequestEmail({
    to: adminEmail,
    userName,
    userEmail: profile.email,
    orgName,
  });

  // Flag the user so they can't send multiple requests
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, deletion_requested: true }
  });

  return NextResponse.json({ success: true });
}
