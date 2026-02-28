import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You give one short, interesting fact with a source. Be accurate and concise.
Reply with a single JSON object only, no other text. Use this exact shape:
{"fact": "the fact text", "sourceUrl": "https://..."}
For sourceUrl, prefer a real, stable URL when possible (e.g. Wikipedia, Britannica, official or well-known reference). Use a relevant, verifiable URL for the topic. If no specific page fits, use a general reference URL for the domain (e.g. https://en.wikipedia.org/wiki/Topic_name).`,
        },
        {
          role: "user",
          content: `Give me one interesting fact about: ${trimmed}. Reply with JSON only: {"fact": "...", "sourceUrl": "..."}`,
        },
      ],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const raw =
      completion.choices[0]?.message?.content?.trim() || "{}";
    let fact = "No fact was returned.";
    let sourceUrl: string | null = null;

    try {
      const parsed = JSON.parse(raw) as { fact?: string; sourceUrl?: string };
      if (typeof parsed.fact === "string" && parsed.fact.trim()) {
        fact = parsed.fact.trim();
      }
      if (typeof parsed.sourceUrl === "string" && parsed.sourceUrl.trim()) {
        const url = parsed.sourceUrl.trim();
        if (url.startsWith("http://") || url.startsWith("https://")) {
          sourceUrl = url;
        }
      }
    } catch {
      // If JSON parsing fails, treat raw as the fact (backward compatibility)
      if (raw && raw !== "{}") fact = raw;
    }

    // Persist via Supabase API (REST)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_API_SECRET_KEY) {
      try {
        const supabase = getSupabase();

        // Prevent duplicate writes: if this exact fact text already exists, skip insert
        const { data: existing } = await supabase
          .from("facts")
          .select("id, fact, source_url")
          .eq("fact", fact)
          .limit(1)
          .maybeSingle();

        if (existing) {
          console.log("[Fact API] Skipping insert — fact already exists:", existing.id);
          return NextResponse.json({
            fact: existing.fact,
            sourceUrl: existing.source_url ?? null,
            duplicate: true,
            id: existing.id,
          });
        }

        const payload = {
          topic: trimmed,
          fact,
          source_url: sourceUrl,
        };
        console.log("[Fact API] Saving to Supabase:", {
          topic: trimmed,
          factLength: fact.length,
          hasSourceUrl: !!sourceUrl,
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

        // Generate and save a quiz question for this fact (one extra OpenAI call at creation time).
        if (factId && typeof fact === "string" && fact.trim()) {
          try {
            // Prevent duplicate quiz for this fact: one quiz per fact_id.
            const { data: existingQuiz } = await supabase
              .from("fact_quizzes")
              .select("id")
              .eq("fact_id", factId)
              .limit(1)
              .maybeSingle();

            if (existingQuiz) {
              console.log("[Fact API] Skipping quiz — fact already has a quiz:", existingQuiz.id);
            } else {
            const quizCompletion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `You generate one short quiz question based on a fact. The answer must be contained in or directly implied by the fact.
Reply with a single JSON object only. Use this exact shape:
{"question": "One clear question (e.g. fill-in, short answer, or true/false)?", "answer": "The exact expected answer (short phrase or word)"}
Keep the answer brief so it can be matched exactly (e.g. a name, number, or short phrase).`,
                },
                {
                  role: "user",
                  content: `Fact: ${fact}\n\nGenerate one quiz question and its exact expected answer. Reply with JSON only: {"question": "...", "answer": "..."}`,
                },
              ],
              max_tokens: 200,
              response_format: { type: "json_object" },
            });
            const quizRaw = quizCompletion.choices[0]?.message?.content?.trim() || "{}";
            const quizParsed = JSON.parse(quizRaw) as { question?: string; answer?: string };
            const quizQuestion = typeof quizParsed.question === "string" ? quizParsed.question.trim() : "";
            const quizAnswer = typeof quizParsed.answer === "string" ? quizParsed.answer.trim() : "";
            if (quizQuestion && quizAnswer) {
              // Prevent duplicate quiz content: if this exact question already exists, skip insert.
              const { data: duplicateQuiz } = await supabase
                .from("fact_quizzes")
                .select("id")
                .eq("question", quizQuestion)
                .limit(1)
                .maybeSingle();

              if (duplicateQuiz) {
                console.log("[Fact API] Skipping quiz insert — question already exists:", duplicateQuiz.id);
              } else {
              const { error: quizError } = await supabase.from("fact_quizzes").insert({
                fact_id: factId,
                question: quizQuestion,
                answer: quizAnswer,
              });
              if (quizError) {
                console.error("[Fact API] Failed to save quiz:", quizError.message);
              } else {
                console.log("[Fact API] Saved quiz for fact:", factId);
              }
              }
            }
            }
          } catch (quizErr) {
            console.error("[Fact API] Quiz generation failed (fact still saved):", quizErr);
          }
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

    return NextResponse.json({ fact, sourceUrl });
  } catch (err) {
    console.error("Fact API error:", err);
    return NextResponse.json(
      { error: "Something went wrong fetching the fact." },
      { status: 500 }
    );
  }
}
