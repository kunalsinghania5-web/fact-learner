import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/** Normalize for comparison: trim, lowercase, collapse spaces. */
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * GET /api/quiz — Returns one random quiz question (no answer).
 * Used by the Quiz me flow. Verification is done against stored answer via POST.
 */
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: rows, error } = await supabase
      .from("fact_quizzes")
      .select("id, fact_id, question")
      .limit(100);

    if (error) {
      console.error("[Quiz API] Supabase error:", error);
      return NextResponse.json(
        { error: "Could not load a quiz question." },
        { status: 500 }
      );
    }

    const list = rows ?? [];
    if (list.length === 0) {
      return NextResponse.json(
        { error: "No quiz questions yet. Generate some facts first." },
        { status: 404 }
      );
    }

    const chosen = list[Math.floor(Math.random() * list.length)];
    return NextResponse.json({
      quizId: chosen.id,
      factId: chosen.fact_id,
      question: chosen.question,
    });
  } catch (err) {
    console.error("[Quiz API] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong loading the quiz." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quiz — Verifies the user's answer against the stored quiz answer.
 * No OpenAI call: we compare to the answer saved when the fact was created.
 * Returns correct/incorrect and the fact so the UI can show it after answering.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { quizId?: string; answer?: string };
    const quizId = typeof body.quizId === "string" ? body.quizId.trim() : "";
    const userAnswer = typeof body.answer === "string" ? body.answer.trim() : "";

    if (!quizId) {
      return NextResponse.json(
        { error: "Missing quiz id." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data: quiz, error: quizError } = await supabase
      .from("fact_quizzes")
      .select("id, fact_id, question, answer")
      .eq("id", quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: "Quiz not found." },
        { status: 404 }
      );
    }

    const expected = normalize(quiz.answer);
    const actual = normalize(userAnswer);
    const correct = expected.length > 0 && actual === expected;

    // Return the fact so the UI can show it after answering.
    const { data: factRow } = await supabase
      .from("facts")
      .select("id, topic, fact")
      .eq("id", quiz.fact_id)
      .single();

    return NextResponse.json({
      correct,
      fact: factRow
        ? {
            id: factRow.id,
            topic: factRow.topic,
            fact: factRow.fact,
          }
        : null,
    });
  } catch (err) {
    console.error("[Quiz API] Verify error:", err);
    return NextResponse.json(
      { error: "Something went wrong verifying the answer." },
      { status: 500 }
    );
  }
}
