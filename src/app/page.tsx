"use client";

import { useState } from "react";

/** Shape of one fact returned by GET /api/facts */
interface PreviousFact {
  id: string;
  topic: string;
  fact: string;
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [fact, setFact] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previousFacts, setPreviousFacts] = useState<PreviousFact[]>([]);
  const [previousLoading, setPreviousLoading] = useState(false);
  const [previousError, setPreviousError] = useState<string | null>(null);
  const [showPrevious, setShowPrevious] = useState(false);

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

  async function handleShowPrevious() {
    setPreviousError(null);
    setShowPrevious(true);
    setPreviousLoading(true);
    try {
      const res = await fetch("/api/facts");
      const data = await res.json();
      if (!res.ok) {
        setPreviousError(data.error ?? "Could not load previous facts.");
        return;
      }
      setPreviousFacts(data.facts ?? []);
    } catch {
      setPreviousError("Could not reach the server. Try again.");
    } finally {
      setPreviousLoading(false);
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
          <button
            type="button"
            onClick={handleShowPrevious}
            disabled={previousLoading}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {previousLoading ? "Loading…" : "See previous facts"}
          </button>
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

        {showPrevious && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Previous facts
            </h2>
            {previousError && (
              <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-red-700 dark:bg-red-950/50 dark:text-red-300">
                {previousError}
              </p>
            )}
            {previousLoading ? (
              <p className="text-zinc-500 dark:text-zinc-400">Loading previous facts…</p>
            ) : previousFacts.length === 0 && !previousError ? (
              <p className="text-zinc-500 dark:text-zinc-400">No previous facts yet. Generate one above!</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {previousFacts.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {item.topic}
                    </p>
                    <p className="mt-1 text-zinc-800 dark:text-zinc-200">{item.fact}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
