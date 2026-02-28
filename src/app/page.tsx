"use client";

import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [fact, setFact] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGetFact(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFact(null);
    setSourceUrl(null);
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
      setSourceUrl(data.sourceUrl ?? null);
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="w-full max-w-lg px-6 py-12">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Fact Learner
        </h1>
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
          <Link
            href="/facts"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            See previous facts
          </Link>
        </form>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        )}

        {fact && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Fact about “{topic}”
            </p>
            <p className="mt-2 text-zinc-800 dark:text-zinc-200">{fact}</p>
            {sourceUrl && (
              <p className="mt-3 text-sm">
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-600 underline decoration-zinc-400 underline-offset-2 hover:text-zinc-900 hover:decoration-zinc-600 dark:text-zinc-400 dark:decoration-zinc-500 dark:hover:text-zinc-100 dark:hover:decoration-zinc-400"
                >
                  View source
                </a>
              </p>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
