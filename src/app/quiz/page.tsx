"use client";

import { useState } from "react";
import Link from "next/link";

interface QuizQuestion {
  quizId: string;
  factId: string;
  question: string;
}

interface FactReveal {
  id: string;
  topic: string;
  fact: string;
}

export default function QuizPage() {
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    fact: FactReveal | null;
  } | null>(null);
  /** Quiz IDs already shown this session — we pass these to the API so it never repeats. */
  const [seenQuizIds, setSeenQuizIds] = useState<Set<string>>(new Set());

  async function loadQuestion() {
    setError(null);
    setResult(null);
    setAnswer("");
    setQuestion(null);
    setLoadingQuestion(true);
    try {
      const exclude =
        seenQuizIds.size > 0 ? Array.from(seenQuizIds).join(",") : "";
      const url = exclude ? `/api/quiz?exclude=${encodeURIComponent(exclude)}` : "/api/quiz";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not load a question.");
        return;
      }
      const next: QuizQuestion = {
        quizId: data.quizId,
        factId: data.factId,
        question: data.question,
      };
      setQuestion(next);
      setSeenQuizIds((prev) => new Set(prev).add(String(next.quizId)));
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoadingQuestion(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question || !answer.trim()) return;
    setError(null);
    setVerifying(true);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: question.quizId, answer: answer.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not verify answer.");
        return;
      }
      setResult({ correct: data.correct, fact: data.fact ?? null });
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-400 transition hover:text-zinc-200"
          >
            ← Fact Learner
          </Link>
          <h1 className="text-lg font-semibold text-zinc-100">Quiz me</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {error && (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        {!question && !loadingQuestion && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 text-center">
            <p className="mb-4 text-zinc-400">
              Get a random question based on facts you’ve already learned.
            </p>
            <button
              type="button"
              onClick={loadQuestion}
              className="rounded-lg bg-zinc-100 px-4 py-3 font-medium text-zinc-900 transition hover:bg-zinc-200"
            >
              Get a question
            </button>
          </div>
        )}

        {loadingQuestion && (
          <p className="text-zinc-500">Loading question…</p>
        )}

        {question && !result && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-lg text-zinc-200">{question.question}</p>
            <div>
              <label htmlFor="answer" className="sr-only">
                Your answer
              </label>
              <input
                id="answer"
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer…"
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                disabled={verifying}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={verifying || !answer.trim()}
                className="rounded-lg bg-zinc-100 px-4 py-3 font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-60"
              >
                {verifying ? "Checking…" : "Submit answer"}
              </button>
              <button
                type="button"
                onClick={loadQuestion}
                className="rounded-lg border border-zinc-600 px-4 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800"
              >
                Skip
              </button>
            </div>
          </form>
        )}

        {result && (
          <div className="space-y-4">
            <div
              className={
                result.correct
                  ? "rounded-lg border border-emerald-800 bg-emerald-950/50 px-4 py-3 text-emerald-300"
                  : "rounded-lg border border-amber-800 bg-amber-950/50 px-4 py-3 text-amber-300"
              }
            >
              {result.correct ? "Correct! Smarty pants!" : "Not quite."}
            </div>
            {result.fact && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5">
                <p className="text-sm font-medium text-zinc-500">{result.fact.topic}</p>
                <p className="mt-2 text-zinc-300 leading-relaxed">{result.fact.fact}</p>
              </div>
            )}
            <button
              type="button"
              onClick={loadQuestion}
              className="rounded-lg bg-zinc-100 px-4 py-3 font-medium text-zinc-900 transition hover:bg-zinc-200"
            >
              Next question
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
