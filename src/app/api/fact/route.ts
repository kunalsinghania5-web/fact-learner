import OpenAI from "openai";
import { NextResponse } from "next/server";
import { after } from "next/server";
import { getSupabase } from "@/lib/supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** Normalize fact to a set of words (lowercase, no punctuation) for overlap comparison. */
function getWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

/** Return how many words from newFact appear in existingFact. */
function matchingWordCount(newFact: string, existingFact: string): number {
  const newWords = getWords(newFact);
  const existingWords = getWords(existingFact);
  return [...newWords].filter((w) => existingWords.has(w)).length;
}

export async function POST(request: Request) {
  try {
    const { topic } = (await request.json()) as { topic?: string };
    const trimmed = typeof topic === "string" ? topic.trim() : "";

    if (!trimmed) {
      return NextResponse.json(
        { error: "Please provide a topic." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server is missing OpenAI API key." },
        { status: 500 }
      );
    }

    // 1) Single OpenAI call: fact + quiz in one round-trip.
    // Using Responses API + gpt-4o-mini: no reasoning tokens (4o-mini isn't a reasoning model).
    // Alternative: keep gpt-5-nano and set reasoning: { effort: "low" } or "minimal" to reduce (not eliminate) reasoning tokens; gpt-5-nano does not support effort: "none".
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      instructions: `You give one short, interesting fact and one quiz question about it. Be accurate and concise.
Reply with a single JSON object only, no other text. Use this exact shape:
{"fact": "the fact text", "question": "One clear quiz question (fill-in, short answer, or true/false)", "answer": "The exact expected answer (short phrase or word)"}
Keep the answer brief so it can be matched exactly.`,
      input: `Give me one interesting fact about: ${trimmed}. Then one quiz question and its exact answer. Reply with JSON only: {"fact": "...", "question": "...", "answer": "..."}`,
      max_output_tokens: 512,
      text: { format: { type: "json_object" } },
    });

    const raw = (response.output_text ?? "").trim() || "{}";
    let fact = "No fact was returned.";
    let quizQuestion = "";
    let quizAnswer = "";

    try {
      const parsed = JSON.parse(raw) as { fact?: string; question?: string; answer?: string };
      if (typeof parsed.fact === "string" && parsed.fact.trim()) {
        fact = parsed.fact.trim();
      }
      if (typeof parsed.question === "string" && parsed.question.trim()) {
        quizQuestion = parsed.question.trim();
      }
      if (typeof parsed.answer === "string" && parsed.answer.trim()) {
        quizAnswer = parsed.answer.trim();
      }
    } catch {
      if (raw && raw !== "{}") fact = raw;
    }

    // Persist via Supabase API (REST)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_API_SECRET_KEY) {
      try {
        const supabase = getSupabase();

        // Single query: fetch same-topic facts, then check exact match + word overlap in memory (one round-trip instead of two).
        const { data: sameTopicFacts } = await supabase
          .from("facts")
          .select("id, fact")
          .eq("topic", trimmed);

        const exactMatch = (sameTopicFacts ?? []).find((row) => row.fact === fact);
        if (exactMatch) {
          console.log("[Fact API] Skipping insert — fact already exists (exact):", exactMatch.id);
          return NextResponse.json({ duplicate: true });
        }

        const overlapThreshold = 15;
        for (const row of sameTopicFacts ?? []) {
          if (matchingWordCount(fact, row.fact) > overlapThreshold) {
            console.log("[Fact API] Skipping insert — fact too similar (word overlap):", row.id);
            return NextResponse.json({ duplicate: true });
          }
        }

        const payload = {
          topic: trimmed,
          fact,
          source_url: null,
        };
        console.log("[Fact API] Saving to Supabase:", {
          topic: trimmed,
          factLength: fact.length,
        });
        const { data, error } = await supabase.from("facts").insert(payload).select();
        if (error) {
          console.error("[Fact API] Supabase error:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }
        const insertedFact = data?.[0];
        const factId = insertedFact?.id;
        console.log("[Fact API] Saved fact:", factId ?? "ok");

        // Save quiz after response is sent so the user sees the fact immediately (quiz is only needed on Quiz page).
        if (factId && quizQuestion && quizAnswer) {
          after(async () => {
            try {
              const sb = getSupabase();
              const { error: quizError } = await sb.from("fact_quizzes").insert({
                fact_id: factId,
                question: quizQuestion,
                answer: quizAnswer,
              });
              if (quizError) {
                console.error("[Fact API] Failed to save quiz:", quizError.message);
              } else {
                console.log("[Fact API] Saved quiz for fact:", factId);
              }
            } catch (quizErr) {
              console.error("[Fact API] Quiz save in after():", quizErr);
            }
          });
        }
      } catch (dbErr) {
        const err = dbErr as { message?: string; code?: string; details?: string; hint?: string };
        console.error("[Fact API] Failed to save fact:", {
          message: err?.message ?? String(dbErr),
          code: err?.code,
          details: err?.details,
          hint: err?.hint,
        });
        return NextResponse.json(
          { error: "Fact was retrieved but could not be saved. Please try again." },
          { status: 500 }
        );
      }
    } else {
      console.log("[Fact API] Skipping save: SUPABASE_URL or SUPABASE_API_SECRET_KEY not set");
    }

    return NextResponse.json({ fact });
  } catch (err) {
    console.error("Fact API error:", err);
    return NextResponse.json(
      { error: "Something went wrong fetching the fact." },
      { status: 500 }
    );
  }
}
