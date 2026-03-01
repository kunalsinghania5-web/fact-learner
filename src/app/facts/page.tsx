"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** Shape of one fact from GET /api/facts */
interface FactRow {
  id: string;
  topic: string;
  fact: string;
  created_at: string;
}

export default function FactsListPage() {
  const [facts, setFacts] = useState<FactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        const res = await fetch("/api/facts");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Could not load facts.");
          return;
        }
        setFacts(data.facts ?? []);
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-400 transition hover:text-zinc-200"
          >
            ← Fact Learner
          </Link>
          <h1 className="text-lg font-semibold text-zinc-100">
            Previously viewed facts
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-950/50 border border-red-800 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-zinc-500">Loading facts…</p>
        ) : facts.length === 0 && !error ? (
          <p className="text-zinc-500">No facts yet. Generate one on the home page.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/30">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-800/60">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Fact
                  </th>
                </tr>
              </thead>
              <tbody>
                {facts.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-b border-zinc-800 transition hover:bg-zinc-800/40 last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/facts/${row.id}`}
                        prefetch={false}
                        className="font-medium text-zinc-200 hover:text-white"
                      >
                        {row.topic}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400 line-clamp-2">
                      {row.fact}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
