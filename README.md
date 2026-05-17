# Nestco

**Live site: [nestco.ai](https://www.nestco.ai)**

UC Berkeley student sublet marketplace. Students browse listings with AI-powered natural language search, message listers privately, post housing requests, and get notified when a new listing matches their criteria. Names stay hidden until both parties mutually match.

## Features

- **AI search** — Natural language chat filters and ranks listings in real time. Ask "furnished studio under $1800 near campus" and it reranks the grid instantly.
- **Compare mode** — Swipe through saved listings side by side with photo lightbox and AI analysis.
- **Privacy-first messaging** — DMs are visible only to participants. Names are hidden until both the lister and renter mutually match.
- **Housing requests** — Post what you're looking for. When a new listing is created that scores ≥ 65% compatibility (via Claude), both parties get an in-app notification and email.
- **Bidirectional matching** — Creating a listing scans existing requests; posting a request scans existing listings. High-scoring matches trigger Resend emails to both sides.
- **Magic link auth** — Listers can publish a listing from the landing page without ever creating a password. Email link → listing live in one click.
- **Photo management** — Upload up to 6 photos per listing with client-side compression (canvas), server-side compression (sharp), drag-to-reorder, and a fullscreen lightbox.
- **Inbox** — Threaded DMs grouped by listing. Mutual match mechanic reveals names when both parties are interested.

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database / Auth | Supabase (Postgres, RLS, Auth, Realtime, Storage) |
| Styling | Tailwind CSS v4 |
| AI | Anthropic Claude API (`claude-haiku-4-5`) |
| Animation | Framer Motion |
| Email | Resend |
| Deployment | Vercel |

## Local Setup

```bash
npm install
cp env.example .env.local  # fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seeding Demo Data

```bash
node scripts/seed.js
```

Seeds 25 listings and 10 housing requests owned by `developer@nestco.edu`. Requires `.env.local` with a valid service role key.

## Architecture Notes

- Server-side API routes use the Supabase service role key to bypass RLS for admin operations (listing activation, match scanning, hard deletes). Client-side always uses the anon key with RLS enforced.
- AI compatibility scoring: Claude receives a listing and a request, returns a 0–100 score and a human-readable reason. Matches ≥ 65 trigger notifications and emails.
- The `/api/chat` route fetches listings, saved IDs, and profile context directly from Supabase server-side instead of trusting client-provided copies.
- Photo uploads are compressed in two passes: client-side via canvas (max 1920px, 80% JPEG) and server-side via `sharp` — handles large HEIC files from iPhones that would otherwise exceed Vercel's 4.5 MB request limit.

See `AGENTS.md` for full codebase documentation.
