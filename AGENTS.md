# Nestco — Codebase Guide

## What this is
Nestco is a UC Berkeley student sublet marketplace. Students can browse listings with AI-powered search, message listers privately, mutually match to reveal identities, post housing requests, and get notified when new listings match their criteria.

## Stack
- **Next.js 16** (App Router, TypeScript) — pages live in `app/`
- **Supabase** — Postgres DB + Auth + Realtime + Storage. Client: `@/lib/supabase`. Auth context: `@/contexts/AuthContext`
- **Tailwind CSS v4** — utility-first, no config file needed
- **Anthropic Claude API** (`claude-haiku-4-5`) — AI chat in `app/api/chat/route.ts`, match scoring in `app/api/match-requests/route.ts`
- **Framer Motion** — swipe gestures on listing cards in browse

## Deployment
- Hosted on **Vercel** — auto-deploys on every push to `main`
- Domain: **nestco.ai** (Cloudflare registrar) → `www.nestco.ai` (canonical, via CNAME to Vercel)
- `nestco.ai` 307-redirects to `www.nestco.ai`
- **Important:** `NEXT_PUBLIC_APP_URL` must be `https://www.nestco.ai` (with www, no trailing slash). If it's `https://nestco.ai`, magic link hashes get stripped on the www redirect.
- Supabase Site URL: `https://www.nestco.ai`
- Supabase Redirect URLs: `https://www.nestco.ai/**` and `https://www.nestco.ai/auth/callback`

## Key pages
| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Landing page — waitlist signup + lister detail form with magic link flow |
| `/browse` | `app/browse/page.tsx` | Main page — listing grid, AI chat panel, detail panel, compare mode |
| `/create` | `app/create/page.tsx` | Post a new listing (multi-step form with photo upload) |
| `/inbox` | `app/inbox/page.tsx` | Two-panel DM interface — conversation list left, thread right. Includes match mechanic. |
| `/requests` | `app/requests/page.tsx` | Browse and post housing requests |
| `/profile` | `app/profile/page.tsx` | Edit profile (name, age, major, year, gender, bio, avatar) |
| `/my-listings` | `app/my-listings/page.tsx` | Manage your own listings (delete only, no edit yet) |
| `/saved` | `app/saved/page.tsx` | Saved/bookmarked listings |
| `/tos` | `app/tos/page.tsx` | Terms of Service page |
| `/activate` | `app/activate/page.tsx` | Magic link landing page — creates listing from pending_listings on auth |
| `/auth/callback` | `app/auth/callback/page.tsx` | Auth callback — reads `?next=` param and redirects after SIGNED_IN. Uses both `onAuthStateChange` and `getSession()` fallback. |

## Key API routes
- `app/api/chat/route.ts` — AI chat. Requires a Supabase Bearer token and rate limits to 30 messages/day per user. Takes `messages` plus optional selected listing context. The server fetches listings, saved IDs, and profile context directly from Supabase instead of trusting client-provided copies. Returns `{ content, rankedIds, scores, suggestedListingId, action, compareIds, draftContent }`. AI prompt instructs plain text only — no markdown formatting.
- `app/api/match-requests/route.ts` — Called after a new listing is created. Requires Bearer token + ownership check. Scores all active requests against the listing using Claude and inserts into `notifications` table.
- `app/api/waitlist/route.ts` — Two-step flow. Step 1: insert email → returns `waitlist_id`. Step 2: accepts FormData (not JSON) with listing details + photo files. Uploads photos to `listing-photos/pending/` in Supabase Storage, saves to `pending_listings`, sends magic link via `signInWithOtp` with `emailRedirectTo: NEXT_PUBLIC_APP_URL + "/auth/callback?next=/activate"`.
- `app/api/activate-listing/route.ts` — Called from `/activate` with Bearer token. Finds pending listing by email, creates real listing in `listings` table, deletes from `pending_listings`.

## Database tables (Supabase)

### `listings`
All listing data. Key fields: `id`, `user_id`, `address`, `type`, `price`, `utilities_included`, `available_from`, `available_to`, `furnished`, `parking`, `pets`, `smokers`, `gender_preference`, `num_roommates`, `roommate_genders`, `roommate_age_min`, `roommate_age_max`, `dwinelle_distance`, `description`, `photos` (string[]), `created_at`.

### `messages`
DMs between users. Fields: `id`, `sender_id`, `recipient_id`, `listing_id`, `content`, `created_at`.
RLS: readable if `sender_id = auth.uid()` OR `recipient_id = auth.uid()` OR `listing_id IN (SELECT id FROM listings WHERE user_id = auth.uid())`.

### `matches`
Mutual match records. Fields: `id`, `listing_id`, `lister_id`, `renter_id`, `lister_interested` (bool), `renter_interested` (bool), `matched_at` (timestamptz, set when both are interested). UNIQUE constraint on `(listing_id, renter_id, lister_id)`. RLS: readable/writable if you are lister or renter.

### `notifications`
In-app alerts for housing request matches. Fields: `user_id`, `listing_id`, `request_id`, `score` (0–100), `reason` (string), `read` (bool).

### `requests`
Housing requests posted by renters. Fields: `user_id`, `description`, `max_price`, `room_types` (array), `gender_preference`, `furnished`, `utilities_included`, `available_from`, `max_walk_minutes`, `pets`, `is_active`, `expires_at`.

### `profiles`
User profiles. Fields: `user_id`, `name`, `age`, `major`, `year_in_school`, `race`, `gender`, `bio`, `avatar_url`, `include_demographics`. The current UI no longer collects race or exposes the include-demographics toggle; AI drafts use only age, gender, year, and major when available. RLS: readable by all authenticated users (needed for name reveal after match).

### `saved_listings`
`user_id` + `listing_id`.

### `Waitlist`
Pre-launch waitlist. Fields: `id`, `email`, `intent` ("find" or "list"), `listing_type`, `location`, `price`, `available_from`, `available_to`, `description`. RLS: enabled (anon INSERT only via policy; no SELECT/UPDATE/DELETE for public).

### `pending_listings`
Listings submitted via waitlist form before the user has an account. Fields: `id`, `email`, `listing_type`, `address`, `price`, `available_from`, `available_to`, `description`, `furnished`, `utilities_included`, `pets`, `parking`, `gender_preference`, `photos` (text, stores JSON array of storage URLs), `status` ("pending"). RLS: enabled — anon INSERT only. Service role key bypasses RLS for server-side reads/deletes.

## Important patterns & conventions

### Auth token passing
The browse page stores a session token in a `useRef` (`sessionTokenRef`) to avoid stale closures. Fetch calls to `/api/chat` and `/api/match-requests` include `Authorization: Bearer <token>` headers. `/api/chat` returns 401 with user-facing copy if the token is missing or invalid.

### Magic link lister flow
1. Lister fills out email + full listing details on `/` (no password, no account)
2. Form submits as **FormData** (not JSON) to `/api/waitlist` — photos are File objects
3. API uploads photos to `listing-photos/pending/` using service role key, saves URLs + all listing data to `pending_listings`, sends magic link via `signInWithOtp` with redirect to `/auth/callback?next=/activate`
4. User clicks email link → `/auth/callback` establishes session → redirects to `/activate`
5. `/activate` calls `/api/activate-listing` with Bearer token → listing published → user redirected to `/my-listings`
6. User ends up with a real Nestco account (no password ever set — magic link only login)

### Auth callback routing
`/auth/callback` reads `?next=` query param (defaults to `/browse`). Uses both `onAuthStateChange` and `getSession()` as fallback in case the SIGNED_IN event fires before the listener is registered. Wrapped in Suspense boundary (required by Next.js for `useSearchParams`).

### Privacy / match model
- Names are hidden until `matched_at` is set on the `matches` record.
- In inbox, the other party shows as "A student" until matched. After match, their real name (from `profiles`) is shown.
- Draft messages from the AI may include age, gender, year, and major but never the user's name.
- AI prompts and UI copy must not use race, ethnicity, cultural background, religion, national origin, or similar protected traits as housing matching or drafting signals.
- `user_email` on request cards is only shown to the card owner (`isOwner === true`) — not to all users.

### Match mechanic (inbox)
- Both listers and renters see a "Match" button per conversation.
- Clicking uses an upsert on `(listing_id, renter_id, lister_id)` with only their field (`lister_interested` or `renter_interested`) to avoid race conditions.
- After upsert, re-fetch the fresh DB record. If both fields are true and `matched_at` is null, set `matched_at`. If either is false and `matched_at` is set, clear it.
- When `matched_at` is set, a `MatchModal` appears (clean white card, green checkmark, name reveal).
- Other party's interest is hidden until match is mutual — you can't see if they're interested until you're both interested.

### Listing types
Internal values: `"Private Room"`, `"Shared Room"`, `"Entire Studio"`, `"Entire 1BR"`, `"Entire 2BR"`. Use `formatType()` in browse/page.tsx for display labels.

### AI chat response format
The chat API always returns raw JSON (not markdown). Claude (`claude-haiku-4-5`) returns:
```json
{ "content": "...", "rankedIds": [], "scores": {}, "suggestedListingId": null, "action": null, "compareIds": null, "draftContent": null }
```
Actions: `show_saved`, `save_current`, `unsave_current`, `clear_saved`, `compare`, `reset`, `send_draft`, `create_request`.
The route strips markdown code blocks if Claude wraps the JSON anyway.
The AI prompt explicitly instructs no markdown formatting (no `**bold**`, no `-` bullet points) — plain text only.

### AI rate limiting
Supabase-backed via `chat_usage` table + `increment_chat_usage` SECURITY DEFINER RPC. Resets daily. Limit: 30 messages/day per user. Returns 429 with a friendly message if exceeded. (Previously in-memory Map — reset on Vercel cold starts.)

### Waitlist details
The waitlist endpoint returns `waitlist_id` on the initial email insert. Follow-up detail submissions must send that `waitlist_id` with the email; the API no longer updates rows by email alone. Step 2 uses FormData (not JSON) to support photo file uploads.

### Message sending flow
1. User clicks "Ask AI to draft" on a listing detail panel → AI returns `draftContent`
2. Draft bubble appears in chat — double-click to edit inline
3. "Send this →" inserts into `messages` with `recipient_id = listing.user_id`
4. Or user says "send it" → AI returns `action: "send_draft"` → auto-sends

### Inbox conversation threading
Conversations are grouped by `${listing_id}__${other_user_id}` from the current user's perspective. Each `Conversation` object includes `listing_user_id` to determine who is lister vs renter for the match mechanic.

### Supabase storage
- Avatars bucket: `avatars/` — use public URLs (cache-busted with `?t=` timestamp)
- Photos bucket: `listing-photos/` — public URLs. Pending listing photos uploaded to `listing-photos/pending/` by service role during waitlist submission.

### match-requests security
The `/api/match-requests` endpoint verifies the Bearer token, fetches the listing, and checks `listing.user_id === user.id` before proceeding. Returns 401/403 otherwise.

## Things NOT yet built
- Email notifications (new message, new match)
- Edit listing (only delete exists in my-listings)
- Mobile layout
- TOS acceptance checkbox on signup
- Listing expiry / auto-deactivation
- Referral/ambassador tracking links
- Full Supabase migrations for all tables, storage buckets, RLS policies, and indexes
- Confirmation email after waitlist signup (users only see on-screen confirmation)
- Magic link login option on the main login page (users who signed up via magic link have no password — they need a way to log back in)
