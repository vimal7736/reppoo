import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasSeenTour = user.user_metadata?.has_seen_tour === true;

    return NextResponse.json({ has_seen_tour: hasSeenTour });
  } catch (error) {
    console.error("Error fetching tour status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: { has_seen_tour: true }
    });

    if (updateError) {
      console.error("Error updating tour status:", updateError);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting tour status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
