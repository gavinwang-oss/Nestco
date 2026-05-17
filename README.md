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

## What I Learned

- **RLS is not enough on its own.** Supabase Row Level Security works well for reads but falls apart for server-side mutations that need to act on behalf of users (match scanning, listing activation, hard deletes). The pattern that works: use the anon key with RLS on the client, and a separate API route with the service role key for anything that needs elevated access — with manual ownership checks in the route handler.
- **SSR and client state don't mix cleanly.** `sessionStorage` and `localStorage` don't exist on the server, so initializing React state from them causes hydration mismatches. The fix is always `useEffect` with an empty dependency array, plus explicit "loaded" flags to prevent effects that depend on that state from firing before it's ready.
- **Magic link auth is deceptively complex.** The `SIGNED_IN` event can fire before the listener is registered on a cold page load, so you need both `onAuthStateChange` and a `getSession()` fallback. Also, bare-domain 307 redirects strip the URL hash, which breaks magic links entirely — the canonical URL must match exactly what Supabase generates.
- **AI as a scoring layer, not a search layer.** Using Claude to return a 0–100 compatibility score between a listing and a request (with a reason string) is more useful than freeform AI search. It's auditable, threshold-able, and easy to explain to users.
- **Photo pipelines need two compression passes.** Client-side canvas compression handles normal uploads. Server-side `sharp` is a second pass for HEIC files from iPhones that bypass the canvas step — without it, those files exceed Vercel's 4.5 MB request limit.

## What I Would Do Differently

- **Write database migrations from day one.** I set up tables manually in the Supabase dashboard, which meant no version-controlled schema, no easy way to reproduce the setup, and RLS policies scattered in a UI with no audit trail. A `supabase/migrations/` folder from the start would have saved a lot of friction.
- **Separate the browse page earlier.** `app/browse/page.tsx` grew to handle the listing grid, AI chat panel, detail panel, compare mode, lightbox, onboarding tooltips, and swipe tutorial — all in one file. That made every change harder than it needed to be. I'd componentize aggressively earlier instead of waiting until it became painful.
- **Use a proper job queue for match scanning.** Right now, scanning all listings/requests runs synchronously inside the API route when a new listing or request is created. For a large dataset this would time out on Vercel's 10-second limit. A background job queue (e.g. Trigger.dev) would be the right call.
- **Plan the auth model before writing any UI.** The split between magic-link-only listers and password users, the admin gate on nav links, and the match privacy model all intersected in ways that weren't obvious upfront and required several rewrites to get right.
