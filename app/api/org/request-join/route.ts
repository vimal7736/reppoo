import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendJoinRequestEmail } from "@/lib/email";

export async function POST(request: Request) {
  const { orgId } = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  if (!orgId) {
    return NextResponse.json({ error: "Organisation ID is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("org_id, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile?.org_id) {
    return NextResponse.json({ error: "You are already linked to an organisation" }, { status: 400 });
  }

  await admin.from("profiles").upsert({
    id: user.id,
    full_name: existingProfile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? "",
    email: existingProfile?.email ?? user.email ?? "",
  }, { onConflict: "id" });

  // 1. Fetch organisation name and owner profile
  // We try to get email, but if the column doesn't exist yet, we'll handle the error
  const { data: org, error: orgErr } = await supabase
    .from("organisations")
    .select("name, profiles(id, role, email)")
    .eq("id", orgId)
    .single();

  if (orgErr || !org) {
    console.error("Join Request Error: Org not found", orgErr);
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
  }

  // Find the owner
  const owners = (org.profiles as any[]).filter(p => p.role === "owner");
  let ownerEmail = owners[0]?.email;

  // If email is missing in the profile table, we can try to fetch it from auth admin
  if (!ownerEmail && owners[0]?.id) {
    const { data: authUser } = await admin.auth.admin.getUserById(owners[0].id);
    ownerEmail = authUser?.user?.email;
  }

  // 2. Create a pending join request
  const { error } = await admin
    .from("access_requests")
    .insert({
      user_id: user.id,
      org_id: orgId,
      status: "pending",
    });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You already have a pending request for this organisation" }, { status: 400 });
    }
    if (error.code === "23503") {
      return NextResponse.json({ error: "An account with this email already exists. Please log in first to request access." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 3. Get user details for email
  const { data: authUser } = await admin.auth.admin.getUserById(user.id);
  const userName = authUser?.user?.user_metadata?.full_name || authUser?.user?.email || "A new user";
  const userEmail = authUser?.user?.email;

  // 4. Send email to owner (non-blocking)
  if (ownerEmail && userEmail) {
    sendJoinRequestEmail({
      to: ownerEmail,
      orgName: org.name,
      userName: userName,
      userEmail: userEmail,
    });
  } else {
    console.warn("Join Request Warning: No owner email found to notify.");
  }

  return NextResponse.json({ success: true });
}
