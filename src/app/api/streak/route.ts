import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * GET /api/streak — Returns the current "fact streak":
 * number of consecutive days (up to and including today or yesterday) where
 * at least one fact was generated. Uses UTC dates for consistency.
 *
 * Why a dedicated endpoint? Computing streak requires scanning fact creation
 * dates; we do this server-side so we don't expose all fact data to the client
 * and we can optimize the query (e.g. only fetch created_at for the last year).
 */
export async function GET() {
  try {
    const supabase = getSupabase();

    // Fetch facts from the last 400 days — enough to compute any realistic streak
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 400);

    const { data: facts, error } = await supabase
      .from("facts")
      .select("created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Streak API] Supabase error:", error);
      return NextResponse.json(
        { error: "Could not compute streak." },
        { status: 500 }
      );
    }

    // Unique calendar days (UTC) when at least one fact was created, newest first
    const dateSet = new Set<string>();
    for (const row of facts ?? []) {
      const t = row.created_at ? new Date(row.created_at) : null;
      if (t && !isNaN(t.getTime())) {
        dateSet.add(toUTCDateString(t));
      }
    }
    const sortedDates = Array.from(dateSet).sort((a, b) => (a > b ? -1 : 1));

    const { streak, lastFactDate } = computeStreak(sortedDates);

    return NextResponse.json({
      streak,
      lastFactDate: lastFactDate ?? null,
    });
  } catch (err) {
    console.error("[Streak API] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong computing streak." },
      { status: 500 }
    );
  }
}

function toUTCDateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Consecutive days ending today (or yesterday if no fact today).
 * Example: facts on Mon, Sun, Sat → streak 3. If today is Monday, streak 3.
 * If today is Tuesday and no fact Tuesday → streak still 3 (ending yesterday).
 */
function computeStreak(sortedDates: string[]): {
  streak: number;
  lastFactDate: string | null;
} {
  if (sortedDates.length === 0) {
    return { streak: 0, lastFactDate: null };
  }

  const today = toUTCDateString(new Date());
  const yesterday = toUTCDateString(
    new Date(Date.now() - 24 * 60 * 60 * 1000)
  );
  const lastFactDate = sortedDates[0] ?? null;

  // Streak ends on the most recent "reference" day that had a fact: today or yesterday
  let streakEnd: string;
  if (sortedDates.includes(today)) {
    streakEnd = today;
  } else if (sortedDates.includes(yesterday)) {
    streakEnd = yesterday;
  } else {
    // Last fact was before yesterday — streak is 0 (broken)
    return { streak: 0, lastFactDate };
  }

  // Count consecutive days backward from streakEnd
  let count = 0;
  let d = new Date(streakEnd + "T12:00:00Z");
  const asSet = new Set(sortedDates);

  while (true) {
    const key = toUTCDateString(d);
    if (!asSet.has(key)) break;
    count++;
    d.setUTCDate(d.getUTCDate() - 1);
  }

  return { streak: count, lastFactDate };
}
