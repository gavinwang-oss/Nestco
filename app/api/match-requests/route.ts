import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Service-role client only used after ownership is verified
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ScoreResponse = {
  score?: unknown;
  reason?: unknown;
};

function parseScoreResponse(raw: string): ScoreResponse {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned) as ScoreResponse;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found");
    return JSON.parse(match[0]) as ScoreResponse;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate the caller using their JWT
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the token and get the user
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId } = await req.json();

    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 });
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Verify the caller owns the listing
    if (listing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: requests, error: requestsError } = await supabase
      .from("requests")
      .select("*")
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString());

    if (requestsError) {
      return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({ matched: 0 });
    }

    const listingDescription = `
Address: ${listing.address}
Type: ${listing.type}
Price: $${listing.price}/mo${listing.utilities_included ? " (utilities included)" : ""}
Available from: ${listing.available_from}${listing.available_to ? ` to ${listing.available_to}` : ""}
Furnished: ${listing.furnished ? "Yes" : "No"}
Pets allowed: ${listing.pets ? "Yes" : "No"}
Gender preference: ${listing.gender_preference}
Walk to campus: ${listing.dwinelle_distance ? `${listing.dwinelle_distance} minutes` : "Unknown"}
Description: ${listing.description}
`.trim();

    let matchedCount = 0;

    for (const request of requests) {
      const requestDescription = `
User request description: ${request.description}
Max price: ${request.max_price ? `$${request.max_price}/mo` : "Not specified"}
Room types wanted: ${request.room_types?.length ? request.room_types.join(", ") : "Any"}
Gender preference: ${request.gender_preference || "Any"}
Wants furnished: ${request.furnished != null ? (request.furnished ? "Yes" : "No") : "Not specified"}
Wants utilities included: ${request.utilities_included != null ? (request.utilities_included ? "Yes" : "No") : "Not specified"}
Available from: ${request.available_from || "Not specified"}
Max walk to campus (minutes): ${request.max_walk_minutes || "Not specified"}
Pets required: ${request.pets != null ? (request.pets ? "Yes" : "No") : "Not specified"}
`.trim();

      try {
        const response = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 256,
          system:
            "You are scoring a new listing against a user's housing request. Return a JSON object with { score: number (0-100), reason: string (1 sentence) }. Score based on how well the listing matches the request description and criteria. Return ONLY the raw JSON, no markdown, no code blocks.",
          messages: [
            {
              role: "user",
              content: `Listing:\n${listingDescription}\n\nRequest:\n${requestDescription}`,
            },
          ],
        });

        const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
        let score = 0;
        let reason = "";
        try {
          const parsed = parseScoreResponse(raw);
          score = typeof parsed.score === "number" ? parsed.score : 0;
          reason = typeof parsed.reason === "string" ? parsed.reason : "";
        } catch {
          console.error("Failed to parse Claude score response:", raw);
          continue;
        }

        if (score >= 65) {
          matchedCount++;
          await supabase.from("notifications").insert({
            user_id: request.user_id,
            type: "listing_match",
            listing_id: listing.id,
            request_id: request.id,
            score,
            reason,
            read: false,
          });
        }
      } catch (err) {
        console.error(`Error scoring request ${request.id}:`, err);
      }
    }

    return NextResponse.json({ matched: matchedCount });
  } catch (error: unknown) {
    console.error("match-requests error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
