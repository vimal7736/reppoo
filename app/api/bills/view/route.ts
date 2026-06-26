import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/bills/view?path=<storage-path>
 * Generates a short-lived signed URL and redirects to it so the PDF opens in a new tab.
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  if (path.startsWith("/") || path.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organisation found" }, { status: 404 });
  }

  if (!path.startsWith(`${profile.org_id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count, error: billLookupError } = await supabase
    .from("bills")
    .select("id", { count: "exact", head: true })
    .eq("org_id", profile.org_id)
    .eq("pdf_url", path);

  if (billLookupError) {
    return NextResponse.json({ error: "Could not verify bill ownership" }, { status: 500 });
  }

  if (!count) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("bills")
    .createSignedUrl(path, 300); // 5 minutes

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Could not generate signed URL" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
