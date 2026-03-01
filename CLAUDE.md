# Fact Learner

A Next.js app that generates interesting facts on any topic using OpenAI, stores them in Supabase, and quizzes users on what they've learned.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL via REST client)
- **AI**: OpenAI API (`gpt-4o-mini` for facts, quizzes, and TTS via `/api/speak`)

## Project Structure

```
src/app/
  page.tsx              # Home — topic input, fact display, streak, TTS
  facts/page.tsx        # All saved facts list
  facts/[id]/page.tsx   # Individual fact detail page
  quiz/page.tsx         # Quiz mode
  api/fact/route.ts     # POST: generate fact + save to Supabase + generate quiz
  api/facts/route.ts    # GET: list all facts
  api/facts/[id]/route.ts # GET: single fact
  api/quiz/route.ts     # GET: fetch a quiz question
  api/speak/route.ts    # POST: text-to-speech via OpenAI
  api/streak/route.ts   # GET: daily learning streak
src/lib/supabase.ts     # Server-only Supabase client (uses secret key)
```

## Environment Variables

Required in `.env.local`:

```
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_API_SECRET_KEY=
```

## Development

```bash
npm run dev    # Start dev server at localhost:3000
npm run build  # Production build
npm run lint   # Run ESLint
```

## Database (Supabase)

Two tables:
- `facts` — `id, topic, fact, source_url, created_at`
- `fact_quizzes` — `id, fact_id, question, answer`

The `/api/fact` route deduplicates facts and quizzes before inserting (checks for existing exact match before each insert).
