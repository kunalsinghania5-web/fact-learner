import { NextResponse } from "next/server";

/**
 * Server-side route that converts text to speech via ElevenLabs.
 * The API key stays on the server so it's never exposed to the client.
 */
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // "George" - clear default voice
const DEFAULT_MODEL = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128"; // Good quality, widely supported in browsers

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Text-to-speech is not configured (missing ELEVENLABS_API_KEY)." },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { text?: string };
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json(
        { error: "Please provide text to speak." },
        { status: 400 }
      );
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;
    const url = `${ELEVENLABS_BASE}/text-to-speech/${voiceId}?output_format=${OUTPUT_FORMAT}`;

    const elevenRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: DEFAULT_MODEL,
      }),
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      console.error("[speak] ElevenLabs error:", elevenRes.status, errText);
      return NextResponse.json(
        { error: "Could not generate speech. Try again later." },
        { status: 502 }
      );
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    console.error("[speak] Error:", e);
    return NextResponse.json(
      { error: "Something went wrong generating speech." },
      { status: 500 }
    );
  }
}
