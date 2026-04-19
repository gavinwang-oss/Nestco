# Nestco

UC Berkeley student sublet marketplace with AI-powered search, privacy-first messaging, and a mutual match system.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key
RESEND_API_KEY=your_resend_key
NEXT_PUBLIC_APP_URL=https://www.nestco.ai
NEXT_PUBLIC_ADMIN_EMAILS=comma_separated_admin_emails
```

`NEXT_PUBLIC_APP_URL` must include `www` (no trailing slash) — magic link hashes get stripped on the bare-domain 307 redirect otherwise.

## What it does

- **Browse** — Authenticated AI chat filters and ranks listings in real time based on natural language input
- **Create** — Multi-step listing form with photo upload
- **Inbox** — Instagram-style DMs with a mutual match mechanic (names hidden until both parties match)
- **Requests** — Post what you're looking for; get notified when a new listing matches
- **Profile** — Name reveal info plus age, year, major, and gender for optional intro-message drafts
- **Saved** — Bookmarked listings
- **My Listings** — View, edit, and delete your own listings
- **Login** — Magic link sign-in at `/login` (for all users; listers who signed up via magic link have no password)
- **TOS** — Terms of Service at `/tos`

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Supabase (Postgres, Auth, Realtime, Storage)
- Tailwind CSS v4
- Anthropic Claude API (`claude-haiku-4-5`)
- Framer Motion

See `AGENTS.md` for full codebase documentation.

## Security Notes

- `/api/chat` requires a Supabase Bearer token. The server loads listings, saved IDs, and profile context directly from Supabase instead of trusting client-provided copies.
- AI-drafted intro messages must not include race, ethnicity, cultural background, religion, national origin, or the user's name.
- Waitlist detail updates require the `waitlist_id` returned by the initial waitlist insert, so details are not updated by email alone.
