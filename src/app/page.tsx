"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [fact, setFact] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [speakError, setSpeakError] = useState<string | null>(null);

  async function fetchStreak() {
    try {
      const res = await fetch("/api/streak");
      const data = await res.json();
      if (res.ok && typeof data.streak === "number") setStreak(data.streak);
    } catch {
      // Non-blocking: leave streak as-is on failure
    }
  }

  useEffect(() => {
    fetchStreak();
  }, []);

  async function handleGetFact(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFact(null);
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/fact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setFact(data.fact);
      setSpeakError(null);
      // Refresh streak after generating a new fact (may have started or extended it)
      fetchStreak();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSpeak() {
    if (!fact) return;
    setSpeakError(null);
    setSpeaking(true);
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fact }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSpeakError(data.error || "Could not play audio.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
    } catch {
      setSpeakError("Could not play audio. Try again.");
    } finally {
      setSpeaking(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="w-full max-w-lg px-6 py-12">
        <h1 className="mb-2 flex items-center gap-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          <Image
            src="/brain-icon.png"
            alt=""
            width={36}
            height={36}
            className="shrink-0"
            aria-hidden
          />
          Fact Learner Get Smarter
        </h1>
        {streak !== null && streak > 0 && (
          <p className="mb-2 flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span aria-hidden>🔥</span>
            <span>{streak} day streak — keep learning every day!</span>
          </p>
        )}
        <p className="mb-8 text-zinc-600 dark:text-zinc-400">
          Enter a topic and get one interesting fact from Open AI.
        </p>

        <form onSubmit={handleGetFact} className="flex flex-col gap-4">
          <label htmlFor="topic" className="sr-only">
            Topic
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. space, history, cats"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Getting fact…" : "Get a fact"}
          </button>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}

          {fact && (
            <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Fact about "{topic}"
                  </p>
                  <p className="mt-2 text-zinc-800 dark:text-zinc-200">{fact}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSpeak}
                  disabled={speaking}
                  className="shrink-0 rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  title={speaking ? "Playing…" : "Listen to this fact"}
                  aria-label={speaking ? "Playing audio" : "Listen to this fact"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6"
                    aria-hidden
                  >
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06Zm5.084 1.046a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 1 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                    <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
              </div>
              {speakError && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  {speakError}
                </p>
              )}
            </div>
          )}

          <Link
            href="/facts"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            See previous facts
          </Link>
          <Link
            href="/quiz"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Quiz me
          </Link>
        </form>

      </main>
    </div>
  );
}
