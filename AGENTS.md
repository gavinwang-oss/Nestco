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
| `/` | `app/page.tsx` → `components/BrowseExperience.tsx` | **The homepage and main page** — listing grid, AI chat panel, detail panel, compare mode. URL stays at root (no `/browse` suffix). `app/page.tsx` just renders `<BrowseExperience />` (the implementation, a client component). Shows profile completion banner if profile is incomplete. Expired listings filtered out. Includes `<OnboardingTooltip>` and `<SwipeTutorial>`. Reads `?listing=<id>` to open a detail panel directly. Unauthenticated visitors are sent to `/login` by `RouteGuard`. |
| `/browse` | `app/browse/page.tsx` | Redirect-only alias for `/`. Client-side `router.replace` to `/`, preserving any query string (e.g. `?listing=123`) so old links, bookmarks, and emails keep working. |
| `/create` | `app/create/page.tsx` | Post a new listing (multi-step form with photo upload) |
| `/inbox` | `app/inbox/page.tsx` | Two-panel DM interface — conversation list left, thread right. Includes match mechanic. |
| `/requests` | `app/requests/page.tsx` | Browse and post housing requests |
| `/profile` | `app/profile/page.tsx` | Edit profile (name, age, major, year, gender, bio, avatar) |
| `/my-listings` | `app/my-listings/page.tsx` | Manage your own listings — view, edit (full field + photo CRUD + photo reorder via EditModal), delete. Shows red "Expired" badge when `available_to` < today. |
| `/saved` | `app/saved/page.tsx` | Saved/bookmarked listings |
| `/tos` | `app/tos/page.tsx` | Terms of Service page. Contact email: support@nestco.ai |
| `/about` | `app/about/page.tsx` | About us — public page; "Berkeley students building a free housing resource for students." Linked in the Navbar (logged-in and logged-out). |
| `/login` | `app/login/page.tsx` | Standalone magic link login page — sends OTP via `signInWithOtp` with `shouldCreateUser: false`. For existing users only (including magic-link-only listers who have no password). |
| `/dev-login` | `app/dev-login/page.tsx` | Dev-only login tool (returns null in production). Shows buttons for each dev email, calls `/api/dev-login` to generate a magic link without sending an email. |
| `/auth/callback` | `app/auth/callback/page.tsx` | Auth callback — reads `?next=` param (defaults to `/`) and redirects after SIGNED_IN. Uses both `onAuthStateChange` and `getSession()` fallback to fix race condition where SIGNED_IN fires before listener registers. |
| `/admin`, `/workspace` | `app/admin/page.tsx`, `app/workspace/page.tsx` | Internal-only dashboards. Restricted to admin emails by `RouteGuard`. |

## Key API routes
- `app/api/chat/route.ts` — AI chat. Requires a Supabase Bearer token and rate limits to 30 messages/day per user. Takes `messages` plus optional selected listing context. The server fetches listings, saved IDs, and profile context directly from Supabase instead of trusting client-provided copies. Returns `{ content, rankedIds, scores, suggestedListingId, action, compareIds, draftContent }`. AI prompt instructs plain text only — no markdown formatting. The currently viewed listing is explicitly injected into the system prompt as "IMPORTANT: The user is currently viewing..." so the AI can answer follow-up questions about it without asking which listing the user means.
- `app/api/match-requests/route.ts` — Called after a new listing is created. Requires Bearer token + ownership check. Scores all active requests against the listing using Claude and inserts into `notifications` table.
- `app/api/dev-login/route.ts` — Dev-only (returns 404 in production). POST with `{ email }` from hardcoded allowlist (`developer@nestco.edu`, `gavin_wang@berkeley.edu`). Returns a magic link URL without sending an email.
- `app/api/notify/message/route.ts` — Sends a "new message" email notification via Resend. Requires Bearer token. Looks up recipient email via service role, skips if sender === recipient. Fire-and-forget from the browse page when a message is sent.
- `app/api/notify/match/route.ts` — Sends "you matched!" email to both lister and renter via Resend when `matched_at` is set. Requires Bearer token. Sends role-specific copy to each party in parallel.

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

### `Waitlist`, `pending_listings` (legacy — no longer written)
These backed the pre-launch waitlist + magic-link lister flow, which was removed at launch. The tables still exist in Supabase (and `/admin` stats still read counts from them) but nothing writes to them anymore. Safe to drop in a future migration if desired.

## Important patterns & conventions

### Auth token passing
The browse page stores a session token in a `useRef` (`sessionTokenRef`) to avoid stale closures. Fetch calls to `/api/chat` and `/api/match-requests` include `Authorization: Bearer <token>` headers. `/api/chat` returns 401 with user-facing copy if the token is missing or invalid.

### Listing creation
Authenticated users post listings via the in-app `/create` multi-step form (photos compressed client-side, then uploaded to `listing-photos/`). The old pre-account waitlist + magic-link "publish your listing" flow was removed at launch.

### Auth callback routing
`/auth/callback` reads `?next=` query param (defaults to `/`). Uses both `onAuthStateChange` and `getSession()` as fallback in case the SIGNED_IN event fires before the listener is registered. Wrapped in Suspense boundary (required by Next.js for `useSearchParams`).

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
Internal values: `"Private Room"`, `"Shared Room"`, `"Entire Studio"`, `"Entire 1BR"`, `"Entire 2BR"`. Use `formatType()` in `components/BrowseExperience.tsx` for display labels.

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

### Onboarding & tutorial components
- `components/OnboardingTooltip.tsx` — 4-step walkthrough shown on first browse visit. localStorage key: `nestco_onboarding_v2`. Steps: AI search → Browse & message → Save & match → Post a request. Backdrop blur overlay, step dots, Next/Skip buttons.
- `components/SwipeTutorial.tsx` — Shown on first listing detail view. localStorage key: `nestco_swipe_tutorial_v1`. Animates a placeholder card swiping left/right using Framer Motion `useMotionValue` + `animate()` loop. Tap anywhere to dismiss.

### Listing expiry
Browse page and AI chat both filter out expired listings using `.or('available_to.is.null,available_to.gte.TODAY')`. My-listings page shows a red "Expired" badge when `available_to` < today.

### Photo reordering
The EditModal in `/my-listings` supports ←/→ buttons on photo thumbnails to reorder photos. First photo is labelled "Cover". Reorder swaps adjacent elements in both the `photos[]` URL array and `photoPreviews[]` display array.

### Photo compression
Photos are compressed client-side before upload to handle large files (e.g. HEIC from iPhones, high-res camera shots) that would exceed Vercel's 4.5MB request limit. `lib/imageUtils.ts` `toJpegBlob()` resizes to max 1920px wide, 80% JPEG quality using canvas. Used in the `/create` form and the `/my-listings` edit modal. (The server-side `sharp` pass was removed with the waitlist route; `sharp` remains a dependency but is no longer used at runtime.)

### Photo lightbox
Clicking a photo in the detail panel opens a fullscreen lightbox overlay (`fixed inset-0 z-[9999]`). Arrow navigation, dot indicators, close via X button, click outside, or Escape key. Implemented directly inside the `DetailPanel` component in `components/BrowseExperience.tsx` using local `lightboxOpen` state.

### Message sending flow
1. User clicks "Ask AI to draft" on a listing detail panel → AI returns `draftContent`
2. Draft bubble appears in chat — double-click to edit inline
3. "Send this →" inserts into `messages` with `recipient_id = listing.user_id`
4. Or user says "send it" → AI returns `action: "send_draft"` → auto-sends

### Inbox conversation threading
Conversations are grouped by `${listing_id}__${other_user_id}` from the current user's perspective. Each `Conversation` object includes `listing_user_id` to determine who is lister vs renter for the match mechanic.

### Supabase storage
- Avatars bucket: `avatars/` — use public URLs (cache-busted with `?t=` timestamp)
- Photos bucket: `listing-photos/` — public URLs, uploaded from the `/create` form.

### match-requests security
The `/api/match-requests` endpoint verifies the Bearer token, fetches the listing, and checks `listing.user_id === user.id` before proceeding. Returns 401/403 otherwise.

## Navbar / access model
- The app is launched: any authenticated user can access Browse (`/`), Requests, My listings, Saved, Inbox, and Profile — all shown in `Navbar.tsx` (desktop + mobile). The logo and the "Browse" link point to `/`.
- **Canonical browse URL is `/`** (the root), not `/browse`. All internal navigation uses `/` and `/?listing=<id>`; `/browse` only exists as a redirect. When updating links, point to `/`, not `/browse`.
- `RouteGuard.tsx`:
  - `PUBLIC_PATHS` (no login): `/login`, `/dev-login`, `/demo`, `/tos`, `/about`, `/auth/callback`.
  - `ADMIN_PATHS` (admin emails only, via `isAdminEmail`): `/admin`, `/workspace`. Non-admins are bounced to `/`.
  - Everything else requires authentication; unauthenticated visitors are redirected to `/login`.
- Unauthenticated users see a "Log in" link (href="/login") in the Navbar (desktop + mobile).
- `AuthModal` (password-based) still exists and is rendered by `Navbar`, but has no trigger. The primary login path for all users is `/login` (magic link).

## Things NOT yet built
- Referral/ambassador tracking links
- Full Supabase migrations for all tables, storage buckets, RLS policies, and indexes
- Dropping the now-orphaned `Waitlist` / `pending_listings` tables
