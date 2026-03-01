import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/learn-more
 * Body: { fact: string, topic?: string }
 * Returns expanded detail for the given fact (2–3 paragraphs). Stateless; no conversation.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { fact?: string; topic?: string };
    const fact = typeof body.fact === "string" ? body.fact.trim() : "";
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";

    if (!fact) {
      return NextResponse.json(
        { error: "Please provide a fact." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server is missing OpenAI API key." },
        { status: 500 }
      );
    }

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      instructions: `The user already knows this fact. Provide 2–3 short paragraphs of additional detail, context, or related information. Stay accurate, concise, and engaging. Do not repeat the fact verbatim; expand on it.`,
      input: topic
        ? `Topic: ${topic}\n\nFact: ${fact}\n\nProvide more detail.`
        : `Fact: ${fact}\n\nProvide more detail.`,
      max_output_tokens: 600,
    });

    const detail = (response.output_text ?? "").trim();
    if (!detail) {
      return NextResponse.json(
        { error: "No additional detail was returned." },
        { status: 502 }
      );
    }

    return NextResponse.json({ detail });
  } catch (err) {
    console.error("[Learn more API] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong fetching more detail." },
      { status: 500 }
    );
  }
}
