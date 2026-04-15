# Nestco — Codebase Guide

## What this is
Nestco is a UC Berkeley student sublet marketplace. Students can browse listings with AI-powered search, message listers privately, mutually match to reveal identities, post housing requests, and get notified when new listings match their criteria.

## Stack
- **Next.js 16** (App Router, TypeScript) — pages live in `app/`
- **Supabase** — Postgres DB + Auth + Realtime + Storage. Client: `@/lib/supabase`. Auth context: `@/contexts/AuthContext`
- **Tailwind CSS v4** — utility-first, no config file needed
- **Anthropic Claude API** (`claude-haiku-4-5`) — AI chat in `app/api/chat/route.ts`, match scoring in `app/api/match-requests/route.ts`
- **Framer Motion** — swipe gestures on listing cards in browse

## Key pages
| Route | File | Purpose |
|---|---|---|
| `/browse` | `app/browse/page.tsx` | Main page — listing grid, AI chat panel, detail panel, compare mode |
| `/create` | `app/create/page.tsx` | Post a new listing (multi-step form with photo upload) |
| `/inbox` | `app/inbox/page.tsx` | Two-panel DM interface — conversation list left, thread right. Includes match mechanic. |
| `/requests` | `app/requests/page.tsx` | Browse and post housing requests |
| `/profile` | `app/profile/page.tsx` | Edit profile (name, age, major, year, gender, bio, avatar) |
| `/my-listings` | `app/my-listings/page.tsx` | Manage your own listings (delete only, no edit yet) |
| `/saved` | `app/saved/page.tsx` | Saved/bookmarked listings |
| `/tos` | `app/tos/page.tsx` | Terms of Service page |

## Key API routes
- `app/api/chat/route.ts` — AI chat. Requires a Supabase Bearer token and rate limits to 30 messages/day per user. Takes `messages` plus optional selected listing context. The server fetches listings, saved IDs, and profile context directly from Supabase instead of trusting client-provided copies. Returns `{ content, rankedIds, scores, suggestedListingId, action, compareIds, draftContent }`.
- `app/api/match-requests/route.ts` — Called after a new listing is created. Requires Bearer token + ownership check. Scores all active requests against the listing using Claude and inserts into `notifications` table.

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

## Important patterns & conventions

### Auth token passing
The browse page stores a session token in a `useRef` (`sessionTokenRef`) to avoid stale closures. Fetch calls to `/api/chat` and `/api/match-requests` include `Authorization: Bearer <token>` headers. `/api/chat` returns 401 with user-facing copy if the token is missing or invalid.

### Privacy / match model
- Names are hidden until `matched_at` is set on the `matches` record.
- In inbox, the other party shows as "A student" until matched. After match, their real name (from `profiles`) is shown.
- Draft messages from the AI may include age, gender, year, and major but never the user's name.
- AI prompts and UI copy must not use race, ethnicity, cultural background, religion, national origin, or similar protected traits as housing matching or drafting signals.

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

### AI rate limiting
In-memory map (`userMessageCounts`) keyed by user ID. Resets daily. Limit: 30 messages/day per user. Returns 429 with a friendly message if exceeded.

### Waitlist details
The waitlist endpoint returns `waitlist_id` on the initial email insert. Follow-up detail submissions must send that `waitlist_id` with the email; the API no longer updates rows by email alone.

### Message sending flow
1. User clicks "Ask AI to draft" on a listing detail panel → AI returns `draftContent`
2. Draft bubble appears in chat — double-click to edit inline
3. "Send this →" inserts into `messages` with `recipient_id = listing.user_id`
4. Or user says "send it" → AI returns `action: "send_draft"` → auto-sends

### Inbox conversation threading
Conversations are grouped by `${listing_id}__${other_user_id}` from the current user's perspective. Each `Conversation` object includes `listing_user_id` to determine who is lister vs renter for the match mechanic.

### Supabase storage
- Avatars bucket: `avatars/` — use public URLs (cache-busted with `?t=` timestamp)
- Photos bucket: `listing-photos/` — public URLs

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
