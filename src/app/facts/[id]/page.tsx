"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface FactDetail {
  id: string;
  topic: string;
  fact: string;
  sourceUrl: string | null;
  created_at: string;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).replace(/-/g, "/");
  } catch {
    return "—";
  }
}

export default function FactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [fact, setFact] = useState<FactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    params.then((p) => {
      if (cancelled) return;
      setId(p.id);
    });
    return () => { cancelled = true; };
  }, [params]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        const res = await fetch(`/api/facts/${id}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Could not load fact.");
          return;
        }
        setFact(data);
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading || !id) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (error || !fact) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-lg px-4 py-12">
          <p className="rounded-lg bg-red-950/50 border border-red-800 px-4 py-3 text-red-300">
            {error ?? "Fact not found."}
          </p>
          <Link
            href="/facts"
            className="mt-4 inline-block text-sm font-medium text-sky-400 hover:text-sky-300"
          >
            ← Back to list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-4">
          <Link
            href="/facts"
            className="text-sm font-medium text-zinc-400 transition hover:text-zinc-200"
          >
            ← Back to list
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {formatDate(fact.created_at)}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-100">
          {fact.topic}
        </h1>
        <p className="mt-4 text-zinc-300 leading-relaxed">{fact.fact}</p>
        {fact.sourceUrl && (
          <p className="mt-6">
            <a
              href={fact.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 underline decoration-sky-500/50 underline-offset-2 hover:text-sky-300 hover:decoration-sky-400"
            >
              View source
            </a>
          </p>
        )}
      </main>
    </div>
  );
}
