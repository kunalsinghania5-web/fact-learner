import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ROW_ID = "default";

/**
 * GET /api/weekly-topic
 * Returns the global weekly topic if set and not older than 7 days.
 * No auth; same topic for all users and devices.
 */
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: row, error } = await supabase
      .from("global_weekly_topic")
      .select("topic, set_at")
      .eq("id", ROW_ID)
      .maybeSingle();

    if (error) {
      console.error("[Weekly topic API] GET error:", error);
      return NextResponse.json({ weeklyTopic: null });
    }

    if (!row?.topic?.trim()) {
      return NextResponse.json({ weeklyTopic: null });
    }

    const setAt = new Date(row.set_at).getTime();
    if (Number.isNaN(setAt) || Date.now() - setAt >= SEVEN_DAYS_MS) {
      return NextResponse.json({ weeklyTopic: null });
    }

    return NextResponse.json({
      weeklyTopic: {
        topic: row.topic.trim(),
        setAt: row.set_at,
      },
    });
  } catch (err) {
    console.error("[Weekly topic API] GET error:", err);
    return NextResponse.json({ weeklyTopic: null });
  }
}

/**
 * POST /api/weekly-topic
 * Body: { topic: string }
 * Sets the global weekly topic (one for the whole app). No auth.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { topic?: string };
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";

    if (!topic) {
      return NextResponse.json(
        { error: "Please provide a topic." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("global_weekly_topic")
      .upsert(
        { id: ROW_ID, topic, set_at: new Date().toISOString() },
        { onConflict: "id" }
      )
      .select("topic, set_at")
      .single();

    if (error) {
      console.error("[Weekly topic API] POST error:", error);
      return NextResponse.json(
        { error: "Could not save weekly topic. Run the Supabase migration for global_weekly_topic if you haven't." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      weeklyTopic: {
        topic: data.topic,
        setAt: data.set_at,
      },
    });
  } catch (err) {
    console.error("[Weekly topic API] POST error:", err);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/weekly-topic
 * Clears the global weekly topic. No auth.
 */
export async function DELETE() {
  try {
    const supabase = getSupabase();
    await supabase.from("global_weekly_topic").delete().eq("id", ROW_ID);
    return NextResponse.json({ weeklyTopic: null });
  } catch (err) {
    console.error("[Weekly topic API] DELETE error:", err);
    return NextResponse.json({ weeklyTopic: null });
  }
}
