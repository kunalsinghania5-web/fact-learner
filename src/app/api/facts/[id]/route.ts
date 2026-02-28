import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/facts/[id] — Returns a single fact by id.
 * Used by the fact detail page so we never expose Supabase on the client.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing fact id." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("facts")
      .select("id, topic, fact, created_at")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Fact not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: data.id,
      topic: data.topic,
      fact: data.fact,
      created_at: data.created_at,
    });
  } catch (err) {
    console.error("[Facts API] Error fetching fact:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
