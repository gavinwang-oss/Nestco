import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DAILY_MESSAGE_LIMIT = 30;
const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 2_000;

type Listing = {
  id: number;
  title: string | null;
  type: string;
  address: string;
  price: number;
  utilities_included: boolean;
  available_from: string;
  available_to: string | null;
  furnished: boolean;
  parking: boolean;
  pets: boolean;
  smokers: boolean;
  dwinelle_distance: number | null;
  gender_preference: string;
  num_roommates: number;
  roommate_genders: string | null;
  roommate_age_min: number | null;
  roommate_age_max: number | null;
  description: string | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type UserProfile = {
  name: string | null;
  age: number | string | null;
  year_in_school: string | null;
  major: string | null;
  gender: string | null;
};

type ChatResponse = {
  content?: unknown;
  rankedIds?: unknown;
  scores?: unknown;
  suggestedListingId?: unknown;
  action?: unknown;
  compareIds?: unknown;
  draftContent?: unknown;
};

function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function createUserSupabaseClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

async function checkRateLimit(userId: string, supabase: ReturnType<typeof createSupabaseClient>): Promise<boolean> {
  const { data, error } = await supabase.rpc("increment_chat_usage", {
    p_user_id: userId,
    p_limit: DAILY_MESSAGE_LIMIT,
  });
  if (error) {
    // If the table/function doesn't exist yet, fail open rather than blocking all users
    console.error("Rate limit check failed:", error.message);
    return true;
  }
  return data === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((message) => {
      const role: ChatMessage["role"] = message.role === "user" ? "user" : "assistant";
      const content = typeof message.content === "string" ? message.content : "";
      return { role, content: content.slice(0, MAX_MESSAGE_LENGTH) };
    })
    .filter((message) => message.content.trim().length > 0)
    .slice(-MAX_MESSAGES);
}

function parseSelectedListingId(body: Record<string, unknown>): number | null {
  if (typeof body.selectedListingId === "number") return body.selectedListingId;
  if (isRecord(body.selectedListing) && typeof body.selectedListing.id === "number") {
    return body.selectedListing.id;
  }
  return null;
}

function parseClaudeJson(raw: string): ChatResponse {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned) as ChatResponse;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in Claude response");
    return JSON.parse(match[0]) as ChatResponse;
  }
}

function normalizeScores(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, score]) => typeof score === "number" && Number.isFinite(score))
      .map(([id, score]) => [id, Math.max(0, Math.min(100, Math.round(score as number)))])
  );
}

function normalizeNumberArray(value: unknown, allowedIds: Set<number>): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is number => typeof id === "number" && allowedIds.has(id));
}

function buildListingSummary(listings: Listing[]): string {
  if (listings.length === 0) return "No listings currently available.";

  return listings
    .map(
      (listing) =>
        `ID ${listing.id}: ${listing.title ? `"${listing.title}" (` : ""}${listing.type} at ${listing.address}${listing.title ? ")" : ""}, $${listing.price}/mo` +
        (listing.utilities_included ? " (utilities incl.)" : "") +
        `, available ${listing.available_from}${listing.available_to ? ` to ${listing.available_to}` : ""}` +
        `, ${listing.furnished ? "furnished" : "unfurnished"}` +
        `, gender: ${listing.gender_preference}` +
        `, ${listing.num_roommates} roommate(s)` +
        (listing.roommate_genders ? `, existing roommates are ${listing.roommate_genders}` : "") +
        (listing.roommate_age_min && listing.roommate_age_max
          ? `, existing roommates aged ${listing.roommate_age_min}-${listing.roommate_age_max}`
          : "") +
        (listing.pets ? ", pets ok" : "") +
        (listing.parking ? ", parking" : "") +
        (listing.dwinelle_distance ? `, ${listing.dwinelle_distance} min walk to Dwinelle` : "") +
        (listing.description ? `, "${listing.description.slice(0, 500)}"` : "")
    )
    .join("\n");
}

function buildProfileSummary(profile: UserProfile | null): string {
  if (!profile) return "User profile: not provided.";

  return [
    "User profile:",
    `Age: ${profile.age ?? "not provided"}`,
    `Year: ${profile.year_in_school ?? "not provided"}`,
    `Major: ${profile.major ?? "not provided"}`,
    ...(profile.gender && profile.gender !== "prefer not to say" ? [`Gender: ${profile.gender}`] : []),
  ].join(" ");
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json(
        { content: "Please log in to use AI search and message drafting." },
        { status: 401 }
      );
    }

    const supabase = createSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { content: "Please log in to use AI search and message drafting." },
        { status: 401 }
      );
    }

    // User-authenticated client — needed for RLS-protected tables (saved_listings, profiles)
    const userSupabase = createUserSupabaseClient(token);

    if (!(await checkRateLimit(user.id, userSupabase))) {
      return NextResponse.json(
        { content: `You've hit the daily limit of ${DAILY_MESSAGE_LIMIT} AI messages. Come back tomorrow!` },
        { status: 429 }
      );
    }

    const body = (await req.json()) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ content: "Invalid request." }, { status: 400 });
    }

    const messages = normalizeMessages(body.messages);
    if (messages.length === 0) {
      return NextResponse.json({ content: "How can I help you find housing?" });
    }

    const selectedListingId = parseSelectedListingId(body);

    const [listingsResult, savedResult, profileResult] = await Promise.all([
      supabase.from("listings").select("*").or(`available_to.is.null,available_to.gte.${new Date().toISOString().slice(0, 10)}`).order("created_at", { ascending: false }),
      userSupabase.from("saved_listings").select("listing_id").eq("user_id", user.id),
      userSupabase
        .from("profiles")
        .select("name, age, year_in_school, major, gender")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (listingsResult.error) {
      return NextResponse.json({ content: "Sorry, I couldn't load listings right now." }, { status: 500 });
    }

    const listings = (listingsResult.data ?? []) as Listing[];
    const allIds = listings.map((listing) => listing.id);
    const allowedIds = new Set(allIds);
    const savedIds = (savedResult.data ?? [])
      .map((row) => row.listing_id)
      .filter((id): id is number => typeof id === "number");
    const selectedListing = selectedListingId
      ? listings.find((listing) => listing.id === selectedListingId) ?? null
      : null;
    const userProfile = (profileResult.data as UserProfile | null) ?? null;

    const listingsSummary = buildListingSummary(listings);
    const savedSummary =
      savedIds.length > 0
        ? `User has saved listing IDs: ${savedIds.join(", ")}`
        : "User has no saved listings.";
    const viewingSummary = selectedListing
      ? `IMPORTANT: The user is currently viewing this specific listing: ${selectedListing.address} (ID ${selectedListing.id}, $${selectedListing.price}/mo, ${selectedListing.type}). When the user says "this", "this listing", "this match", or any similar reference, they mean THIS listing. You already know which listing they are asking about.`
      : "No listing currently selected.";
    const profileSummary = buildProfileSummary(userProfile);

    const systemPrompt = `You are Nestco's AI assistant, a friendly, concise housing search assistant for UC Berkeley students looking for sublets.

Available listings:
${listingsSummary}

${savedSummary}
${viewingSummary}
${profileSummary}

CRITICAL INSTRUCTION: You must respond with ONLY a raw JSON object. No markdown, no code blocks, no backticks, no extra text before or after. The entire response must be parseable by JSON.parse().

Format:
{"content": "your message here", "rankedIds": [id1, id2], "scores": {"id1": 95}, "suggestedListingId": null, "action": null, "compareIds": null, "draftContent": null}

Rules:
- rankedIds lists listing IDs [${allIds.join(", ")}] ordered by relevance to the user's accumulated criteria.
- scores maps listing IDs to 0-100 match percentages. When the user mentions ANY specific criteria (price, dates, type, gender preference, furnishing, utilities, roommates, distance, pets, parking, etc.), score EVERY SINGLE listing ID — do not omit any. A listing that meets ALL stated requirements MUST score exactly 100 — do NOT cap at 95 or 99 to seem more realistic; 100 is a valid and expected score. Only deduct points for criteria the listing explicitly fails to meet — do not deduct for subjective reasons, proximity guesses, or things not mentioned by the user. Partial matches (meets most but not all criteria) score 50-99. Incompatible listings score 10-40. Never omit a listing from scores once criteria exist. Only hard-zero a listing if it is completely incompatible (e.g. wrong gender for a gender-locked listing). If the user has not mentioned any criteria at all, set scores to {}.
- For gender, distinguish who can move in from the gender of existing roommates. Only use listing fields provided above. Do not infer or recommend based on race, ethnicity, religion, national origin, or other protected characteristics.
- Keep content to 2-4 sentences. Do not list every listing in content; the UI shows listing cards. Never use markdown formatting (no **bold**, no bullet points with -, no headers) — plain text only.
- For message drafts, do not include the user's name. Use this exact format when profile data is available: "Hey, I'm a [age]-year-old [gender] [year] [major] student interested in your place. [One short relevant detail if it fits naturally.] I'd love to come check it out — when works?" Include age, year, and major always. Only include [gender] if the user's gender is provided and is not "prefer not to say" — if gender is missing or prefer-not-to-say, drop it entirely and do not leave a grammatical gap (e.g. "I'm a 21-year-old junior" not "I'm a 21-year-old  junior"). Never include race, ethnicity, cultural background, religion, or national origin.
- When asked about listings, refer to specific ones by their title if they have one, otherwise by address and price.
- Stay focused on housing and redirect off-topic questions.
- Never mention listing IDs to the user.

Actions:
- "show_saved" for showing saved listings.
- "save_current" for saving the current listing.
- "unsave_current" for removing the current listing from saves.
- "clear_saved" for removing all saved listings.
- "compare" for comparing exactly 2 listings; set compareIds to exactly 2 valid listing IDs.
- "reset" for showing all listings again.
- "send_draft" when the user approves the last draft.
- "create_request" when the user wants to be notified about future matches.
- suggestedListingId must be set when draftContent is generated.`;

    const validMessages: ChatMessage[] = [];
    for (const message of messages) {
      if (
        validMessages.length === 0 ||
        validMessages[validMessages.length - 1].role !== message.role
      ) {
        validMessages.push(message);
      }
    }

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      system: systemPrompt,
      messages: validMessages,
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";

    let content = "";
    let rankedIds: number[] = allIds;
    let scores: Record<string, number> = {};
    let suggestedListingId: number | null = null;
    let action: string | null = null;
    let compareIds: number[] | null = null;
    let draftContent: string | null = null;

    try {
      const parsed = parseClaudeJson(raw);
      content = typeof parsed.content === "string" ? parsed.content : "";
      const parsedRankedIds = normalizeNumberArray(parsed.rankedIds, allowedIds);
      rankedIds = parsedRankedIds.length > 0 ? parsedRankedIds : allIds;
      scores = normalizeScores(parsed.scores);
      suggestedListingId =
        typeof parsed.suggestedListingId === "number" && allowedIds.has(parsed.suggestedListingId)
          ? parsed.suggestedListingId
          : null;
      action = typeof parsed.action === "string" ? parsed.action : null;
      const parsedCompareIds = normalizeNumberArray(parsed.compareIds, allowedIds).slice(0, 2);
      compareIds = parsedCompareIds.length > 0 ? parsedCompareIds : null;
      draftContent = typeof parsed.draftContent === "string" ? parsed.draftContent : null;
    } catch {
      content = raw.replace(/\{[\s\S]*\}/, "").trim() || "Sorry, I couldn't process that.";
    }

    return NextResponse.json({
      content,
      rankedIds,
      scores,
      suggestedListingId,
      action,
      compareIds,
      draftContent,
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { content: "Sorry, I ran into an error. Please try again." },
      { status: 500 }
    );
  }
}
