This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Database (Supabase API)

Facts are stored in Supabase using the **Supabase REST API** (project URL + API secret key). To enable persistence:

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy **Project URL** and the **API secret key** (the secret key; never use it in client-side code).
3. Add to `.env`: `SUPABASE_URL` and `SUPABASE_API_SECRET_KEY`.
4. Create the `facts` table: open **SQL Editor** in the Supabase dashboard, run the script in `supabase/facts-table.sql`.
5. Restart the dev server. Each fact returned by the API will be saved to the `facts` table.

If `SUPABASE_URL` or `SUPABASE_API_SECRET_KEY` is missing, the app still returns facts from OpenAI but does not save them.

### Text-to-speech (ElevenLabs)

After a fact is shown, a speaker button lets you hear it read aloud via [ElevenLabs](https://elevenlabs.io):

1. Get an API key from the ElevenLabs dashboard (API Keys section).
2. Add to `.env`: `ELEVENLABS_API_KEY=your_key`.
3. (Optional) To use a different voice, set `ELEVENLABS_VOICE_ID` to a [voice ID](https://elevenlabs.io/docs/api-reference/voices) from your account. If unset, a default voice is used.

If `ELEVENLABS_API_KEY` is missing, the speaker button still appears but requests will fail with a friendly error.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
