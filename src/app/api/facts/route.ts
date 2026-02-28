import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/facts — Returns the last 5 facts from Supabase (by created_at desc).
 * Used by the "See previous facts" button so the client never touches Supabase directly.
 */
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("facts")
      .select("id, topic, fact, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Facts API] Supabase error:", error);
      return NextResponse.json(
        { error: "Could not load previous facts." },
        { status: 500 }
      );
    }

    return NextResponse.json({ facts: data ?? [] });
  } catch (err) {
    console.error("[Facts API] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong loading facts." },
      { status: 500 }
    );
  }
}
