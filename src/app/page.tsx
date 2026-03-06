"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

const WEEKLY_STORAGE_KEY = "fact-learner-weekly";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type FactMode = "daily" | "weekly";

interface StoredWeekly {
  topic: string;
  setAt: string;
}

function getStoredWeeklyTopic(): StoredWeekly | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WEEKLY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredWeekly;
    if (!parsed?.topic?.trim() || !parsed?.setAt) return null;
    const setAt = new Date(parsed.setAt).getTime();
    if (Number.isNaN(setAt) || Date.now() - setAt >= SEVEN_DAYS_MS) return null;
    return { topic: parsed.topic.trim(), setAt: parsed.setAt };
  } catch {
    return null;
  }
}

function setStoredWeeklyTopic(topic: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      WEEKLY_STORAGE_KEY,
      JSON.stringify({ topic: topic.trim(), setAt: new Date().toISOString() })
    );
  } catch {
    // ignore
  }
}

function clearStoredWeeklyTopic(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WEEKLY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Curated list of diverse topics for "random topic" — keeps the surprise fun and the facts varied.
const RANDOM_TOPICS = [
  "space exploration",
  "ancient Rome",
  "ocean depths",
  "human brain",
  "world cuisines",
  "inventions",
  "endangered species",
  "linguistics",
  "architecture",
  "music history",
  "weather phenomena",
  "mathematics",
  "mythology",
  "robotics",
  "coffee",
  "volcanoes",
  "chess",
  "sleep science",
  "origami",
  "cryptography",
];

export default function Home() {
  const [factMode, setFactMode] = useState<FactMode>("daily");
  const [topic, setTopic] = useState("");
  const [weeklyTopic, setWeeklyTopic] = useState<StoredWeekly | null>(null);
  const [fact, setFact] = useState<string | null>(null);
  const [displayTopic, setDisplayTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const [learnMoreLoading, setLearnMoreLoading] = useState(false);
  const [learnMoreDetail, setLearnMoreDetail] = useState<string | null>(null);
  const [learnMoreError, setLearnMoreError] = useState<string | null>(null);

  const fetchWeeklyTopic = useCallback(async () => {
    try {
      const res = await fetch("/api/weekly-topic");
      const data = await res.json();
      if (res.ok && data.weeklyTopic) {
        setWeeklyTopic({
          topic: data.weeklyTopic.topic,
          setAt: data.weeklyTopic.setAt,
        });
        return;
      }
      const local = getStoredWeeklyTopic();
      setWeeklyTopic(local);
    } catch {
      setWeeklyTopic(getStoredWeeklyTopic());
    }
  }, []);

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

  useEffect(() => {
    if (factMode === "weekly") fetchWeeklyTopic();
  }, [factMode, fetchWeeklyTopic]);

  async function fetchFactForTopic(
    trimmedTopic: string,
    options?: { saveAsWeeklyTopic?: boolean }
  ) {
    setError(null);
    setFact(null);
    setLoading(true);

    if (options?.saveAsWeeklyTopic) {
      try {
        const res = await fetch("/api/weekly-topic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: trimmedTopic }),
        });
        const data = await res.json();
        if (res.status === 401) {
          setStoredWeeklyTopic(trimmedTopic);
          setWeeklyTopic({
            topic: trimmedTopic,
            setAt: new Date().toISOString(),
          });
        } else if (!res.ok) {
          setError(data.error || "Could not save weekly topic.");
          setLoading(false);
          return;
        } else if (data.weeklyTopic) {
          clearStoredWeeklyTopic();
          setWeeklyTopic({ topic: data.weeklyTopic.topic, setAt: data.weeklyTopic.setAt });
        }
      } catch {
        setError("Could not save weekly topic. Try again.");
        setLoading(false);
        return;
      }
    }

    const maxRetries = 10;

    try {
      let data: { fact?: string; duplicate?: boolean; error?: string };
      let res: Response;
      let attempts = 0;

      do {
        attempts++;
        res = await fetch("/api/fact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: trimmedTopic }),
        });
        data = await res.json();

        if (!res.ok) {
          setError(data.error || "Something went wrong.");
          return;
        }
        if (!data.duplicate) break;
      } while (attempts < maxRetries);

      if (data.duplicate) {
        setError(
          "We couldn't find a new fact for this topic after several tries. Try again or pick a different topic."
        );
        return;
      }

      setFact(data.fact ?? null);
      setDisplayTopic(trimmedTopic);
      setSpeakError(null);
      setLearnMoreDetail(null);
      setLearnMoreError(null);
      if (options?.saveAsWeeklyTopic) {
        fetchWeeklyTopic();
      }
      fetchStreak();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGetFact(e: React.FormEvent) {
    e.preventDefault();
    if (factMode === "daily") {
      if (!topic.trim()) {
        setError("Please enter a topic.");
        return;
      }
      await fetchFactForTopic(topic.trim());
      return;
    }
    // Weekly: either setting a new topic or getting fact for existing weekly topic
    if (weeklyTopic) {
      await fetchFactForTopic(weeklyTopic.topic);
      return;
    }
    if (!topic.trim()) {
      setError("Please enter a topic for this week.");
      return;
    }
    await fetchFactForTopic(topic.trim(), { saveAsWeeklyTopic: true });
  }

  function handleSetWeeklyTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) {
      setError("Please enter a topic for this week.");
      return;
    }
    setError(null);
    fetchFactForTopic(topic.trim(), { saveAsWeeklyTopic: true });
  }

  async function handleChangeWeeklyTopic() {
    clearStoredWeeklyTopic();
    setWeeklyTopic(null);
    setTopic("");
    setFact(null);
    setDisplayTopic("");
    setError(null);
    try {
      const res = await fetch("/api/weekly-topic", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not clear weekly topic.");
      }
    } catch {
      setError("Could not clear weekly topic. Try again.");
    }
  }

  function handleRandomTopic() {
    const randomTopic =
      RANDOM_TOPICS[Math.floor(Math.random() * RANDOM_TOPICS.length)];
    setTopic(randomTopic);
    setError(null);
    fetchFactForTopic(randomTopic);
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

  async function handleLearnMore() {
    if (!fact) return;
    setLearnMoreError(null);
    setLearnMoreLoading(true);
    try {
      const res = await fetch("/api/learn-more", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fact, topic: (displayTopic || topic).trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLearnMoreError(data.error ?? "Could not load more detail.");
        return;
      }
      setLearnMoreDetail(typeof data.detail === "string" ? data.detail : null);
    } catch {
      setLearnMoreError("Could not load more detail. Try again.");
    } finally {
      setLearnMoreLoading(false);
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

        <div className="mb-6 flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => {
              setFactMode("daily");
              setError(null);
            }}
            aria-pressed={factMode === "daily"}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              factMode === "daily"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Daily fact
          </button>
          <button
            type="button"
            onClick={() => {
              setFactMode("weekly");
              setError(null);
              fetchWeeklyTopic();
            }}
            aria-pressed={factMode === "weekly"}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              factMode === "weekly"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Weekly fact
          </button>
        </div>

        <form
          onSubmit={factMode === "daily" ? handleGetFact : weeklyTopic ? handleGetFact : handleSetWeeklyTopic}
          className="flex flex-col gap-4"
        >
          {factMode === "daily" ? (
            <>
              <label htmlFor="topic" className="sr-only">
                Topic
              </label>
              <div className="flex gap-2">
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. space, history, cats"
                  className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={handleRandomTopic}
                  disabled={loading}
                  title="Surprise me — random topic"
                  aria-label="Pick a random topic and get a fact"
                  className="flex h-[46px] w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <path fillRule="evenodd" d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6Zm4.5 7.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm7.5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm-3-4.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm-4.5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? "Getting fact…" : "Get a fact"}
              </button>
            </>
          ) : (
            <>
              {weeklyTopic ? (
                <>
                  <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    This week&apos;s topic: <strong>{weeklyTopic.topic}</strong>
                    <button
                      type="button"
                      onClick={handleChangeWeeklyTopic}
                      className="ml-2 text-sm underline hover:no-underline"
                    >
                      Change topic
                    </button>
                  </p>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {loading ? "Getting fact…" : "Get this week's fact"}
                  </button>
                </>
              ) : (
                <>
                  <label htmlFor="weekly-topic" className="sr-only">
                    Topic for this week
                  </label>
                  <input
                    id="weekly-topic"
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. space, history, cats — topic for the next 7 days"
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {loading ? "Setting topic & getting fact…" : "Set topic & get fact"}
                  </button>
                </>
              )}
            </>
          )}

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
                    {factMode === "daily" ? "Daily" : "Weekly"} fact about &quot;{displayTopic || topic}&quot;
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
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleLearnMore}
                  disabled={learnMoreLoading}
                  className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  {learnMoreLoading ? "Loading…" : "Learn more"}
                </button>
              </div>
              {learnMoreDetail && (
                <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-600 dark:bg-zinc-800/50">
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    More detail
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                    {learnMoreDetail}
                  </p>
                </div>
              )}
              {learnMoreError && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  {learnMoreError}
                </p>
              )}
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
