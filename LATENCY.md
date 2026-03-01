# Fact display latency: analysis and improvements

## Where time is spent today

When you click **"Get a fact"**, the following runs **sequentially** before the UI can show the fact:

| Step | What happens | Typical cost |
|------|------------------------------|--------------|
| 1 | **OpenAI #1** – Generate fact (gpt-5-nano) | ~1–3 s |
| 2 | **Supabase** – Check exact duplicate (`facts.fact = ?`) | ~50–200 ms |
| 3 | **Supabase** – Fetch *all* same-topic facts for overlap check | ~50–500 ms (grows with topic size) |
| 4 | **Supabase** – Insert fact | ~50–200 ms |
| 5 | **OpenAI #2** – Generate quiz question + answer | ~1–3 s |
| 6 | **Supabase** – Insert quiz row | ~50–200 ms |

Only after step 6 does the API return `{ fact }`, so the **user waits for the full pipeline** (often 3–8+ seconds). The main bottlenecks are:

1. **Two sequential OpenAI calls** – Most of the wait is fact generation + quiz generation back-to-back.
2. **Quiz before response** – The UI could show the fact as soon as the fact is saved; today it also waits for quiz generation and quiz insert.
3. **Multiple Supabase round-trips** – Four separate calls; the "same-topic" fetch can be heavy for popular topics.

---

## Improvements implemented

### 1. Single OpenAI call for fact + quiz

**Why:** One round-trip to the API instead of two cuts LLM latency roughly in half and reduces cost.

**What:** The fact API now asks for a single JSON: `{ "fact": "...", "question": "...", "answer": "..." }`. We parse once and use the same fact for duplicate checks and for saving the quiz after the fact is stored.

### 2. Return the fact as soon as it's saved; quiz in background

**Why:** Users care about seeing the fact quickly. The quiz is only needed when they open "Quiz me", so we don't need to block the fact response on quiz generation.

**What:** After we have the fact and have inserted it into `facts`, we immediately return `NextResponse.json({ fact })`. Quiz generation and `fact_quizzes` insert run inside `after()` from `next/server`, so they run after the response is sent and don't add to perceived latency.

### 3. One Supabase query for duplicate checks

**Why:** We were doing two reads: one for exact match, one for same-topic facts. Both can be answered from a single "same-topic" query (exact match is just a filter in code).

**What:** We fetch same-topic facts once. We then check (a) exact match and (b) word-overlap in memory. This removes one Supabase round-trip per request.

---

## Optional future improvements

- **Streaming the fact:** Use OpenAI streaming and stream the fact text to the client so the first sentence can appear before the full JSON is ready (more complex, but best perceived latency).
- **Limit same-topic fetch:** e.g. `.order('created_at', { ascending: false }).limit(100)` so duplicate check stays fast for very popular topics.
- **Caching:** Short-lived cache for "recent facts for topic X" to avoid re-fetching on every request (only useful under high load).

---

## How to verify

1. **Network:** Open DevTools → Network, trigger "Get a fact". The `/api/fact` request should complete in roughly **1–3 seconds** (one LLM call + DB), and the fact should appear as soon as that response arrives.
2. **Quiz still works:** Open "Quiz me" after learning a new fact; the new fact's quiz should appear once the background job has run (usually within a few seconds).
3. **Console:** Server logs should show fact save first, then quiz save (order may vary with `after()`).
