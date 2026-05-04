"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type DbMessage = {
  id: number;
  sender_id: string;
  recipient_id: string | null;
  listing_id: number;
  content: string;
  created_at: string;
  listing?: { id: number; title?: string | null; address: string; type: string; user_id: string } | null;
};

type MatchRecord = {
  id: string;
  listing_id: number;
  renter_id: string;
  lister_id: string;
  renter_interested: boolean;
  lister_interested: boolean;
  matched_at: string | null;
};

type Notification = {
  id: number;
  type: string;
  listing_id: number;
  request_id: number;
  score: number;
  reason: string;
  read: boolean;
  created_at: string;
  listing?: { title?: string | null; address: string; type: string; price: number };
};

type Conversation = {
  key: string;
  listing_id: number;
  listing_address: string;
  listing_type: string;
  listing_user_id: string;
  other_user_id: string;
  messages: DbMessage[];
};

type Tab = "messages" | "alerts";

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleString("en-US", { month: "short", day: "numeric" });
}

// ─── Match Modal ──────────────────────────────────────────────────────────────

function MatchModal({
  otherName,
  listingAddress,
  onDismiss,
}: {
  otherName: string;
  listingAddress: string;
  onDismiss: () => void;
}) {
  return (
    <>
      <style>{`
        @keyframes modal-in {
          0%   { transform: scale(0.95) translateY(8px); opacity: 0; }
          100% { transform: scale(1) translateY(0);      opacity: 1; }
        }
      `}</style>
      {/* Backdrop */}
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ zIndex: 150, backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
        onClick={onDismiss}
      >
        {/* Card */}
        <div
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center"
          style={{ animation: "modal-in 0.25s ease-out both" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Text */}
          <h2 className="text-xl font-bold text-gray-950 tracking-tight">You&apos;re connected</h2>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            You and <span className="text-gray-900 font-semibold">{otherName}</span> both expressed interest in{" "}
            <span className="text-gray-900 font-medium">{listingAddress}</span>.
          </p>

          {/* Name unlock note */}
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            <span className="text-green-700 text-xs font-medium">Names are now visible</span>
          </div>

          {/* Button */}
          <button
            onClick={onDismiss}
            className="mt-6 w-full py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Keep chatting
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Inbox() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [tab, setTab] = useState<Tab>("messages");
  const [allMessages, setAllMessages] = useState<DbMessage[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [otherProfiles, setOtherProfiles] = useState<Record<string, string>>({}); // userId → name
  const [fetching, setFetching] = useState(true);
  const [selectedConvKey, setSelectedConvKey] = useState<string | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [celebration, setCelebration] = useState<{ otherUserId: string; listingAddress: string } | null>(null);
  const shownMatchIds = useRef<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchOtherProfile = useCallback(async (userId: string) => {
    if (otherProfiles[userId]) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, name")
      .eq("user_id", userId)
      .single();
    if (data?.name) {
      setOtherProfiles((prev) => ({ ...prev, [userId]: data.name }));
    }
  }, [otherProfiles]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [msgsResult, matchesResult, notifsResult] = await Promise.all([
      supabase
        .from("messages")
        .select("*, listing:listings(id, title, address, type, user_id)")
        .order("created_at", { ascending: true }),
      supabase
        .from("matches")
        .select("*")
        .or(`renter_id.eq.${user.id},lister_id.eq.${user.id}`),
      supabase
        .from("notifications")
        .select("*, listing:listings(title, address, type, price)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (msgsResult.data) setAllMessages(msgsResult.data as DbMessage[]);
    if (matchesResult.data) {
      setMatches(matchesResult.data as MatchRecord[]);
      // Pre-fetch profiles for already-matched conversations
      for (const m of matchesResult.data) {
        if (m.matched_at) {
          const otherId = m.renter_id === user.id ? m.lister_id : m.renter_id;
          fetchOtherProfile(otherId);
        }
      }
    }
    if (notifsResult.data) setNotifications(notifsResult.data as Notification[]);

    setFetching(false);
  }, [user, fetchOtherProfile]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/browse"); return; }
    fetchData();

    // Messages subscription
    const msgChannel = supabase
      .channel("inbox_messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const raw = payload.new as DbMessage;
        if (raw.sender_id !== user.id && raw.recipient_id !== user.id) return;
        const { data } = await supabase
          .from("messages")
          .select("*, listing:listings(id, title, address, type, user_id)")
          .eq("id", raw.id)
          .single();
        if (data) setAllMessages((prev) => [...prev, data as DbMessage]);
      })
      .subscribe();

    // Matches subscription — triggers celebration when other person clicks Match
    const matchChannel = supabase
      .channel("inbox_matches")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, async (payload) => {
        const m = payload.new as MatchRecord;
        if (m.renter_id !== user.id && m.lister_id !== user.id) return;
        setMatches((prev) => {
          const idx = prev.findIndex((x) => x.id === m.id);
          return idx >= 0 ? prev.map((x, i) => (i === idx ? m : x)) : [...prev, m];
        });
        // Show celebration if new mutual match and not already shown
        if (m.matched_at && !shownMatchIds.current.has(m.id)) {
          shownMatchIds.current.add(m.id);
          const otherId = m.renter_id === user.id ? m.lister_id : m.renter_id;
          await fetchOtherProfile(otherId);
          // Get listing address from messages
          setAllMessages((msgs) => {
            const msg = msgs.find((msg) => msg.listing_id === m.listing_id);
            const addr = msg?.listing?.address ?? "the listing";
            setCelebration({ otherUserId: otherId, listingAddress: addr });
            return msgs;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(matchChannel);
    };
  }, [user, loading, router, fetchData, fetchOtherProfile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConvKey, allMessages]);

  // ── Conversation grouping ─────────────────────────────────────────────────

  const conversations: Conversation[] = useMemo(() => {
    if (!user) return [];
    const map = new Map<string, Conversation>();

    for (const msg of allMessages) {
      const otherId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
      if (!otherId) continue;
      const key = `${msg.listing_id}__${otherId}`;
      const listing = msg.listing as { id: number; title?: string | null; address: string; type: string; user_id: string } | null;

      if (!map.has(key)) {
        map.set(key, {
          key,
          listing_id: msg.listing_id,
          listing_address: listing?.title ?? listing?.address ?? `Listing #${msg.listing_id}`,
          listing_type: listing?.type ?? "",
          listing_user_id: listing?.user_id ?? "",
          other_user_id: otherId,
          messages: [],
        });
      }
      map.get(key)!.messages.push(msg);
    }

    return Array.from(map.values()).sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.created_at ?? "";
      const bLast = b.messages[b.messages.length - 1]?.created_at ?? "";
      return bLast.localeCompare(aLast);
    });
  }, [allMessages, user]);

  const selectedConv = conversations.find((c) => c.key === selectedConvKey) ?? null;
  const firstConversationKey = conversations[0]?.key;

  useEffect(() => {
    if (!selectedConvKey && firstConversationKey) {
      setSelectedConvKey(firstConversationKey);
    }
  }, [firstConversationKey, selectedConvKey]);

  // ── Match helpers ─────────────────────────────────────────────────────────

  const getMatchForConv = useCallback(
    (conv: Conversation): MatchRecord | undefined => {
      if (!user) return undefined;
      const renterId = conv.listing_user_id === user.id ? conv.other_user_id : user.id;
      return matches.find(
        (m) =>
          m.listing_id === conv.listing_id &&
          m.lister_id === conv.listing_user_id &&
          m.renter_id === renterId
      );
    },
    [matches, user]
  );

  const handleMatchToggle = async (conv: Conversation) => {
    if (!user) return;

    const iAmLister = conv.listing_user_id === user.id;
    const lister_id = conv.listing_user_id;
    const renter_id = iAmLister ? conv.other_user_id : user.id;
    const myField = iAmLister ? "lister_interested" : "renter_interested";

    const existing = getMatchForConv(conv);
    const currentlyInterested = existing
      ? (iAmLister ? existing.lister_interested : existing.renter_interested)
      : false;
    const newValue = !currentlyInterested;

    // Upsert only our field — safe whether or not the other party already created the record
    const { error } = await supabase.from("matches").upsert(
      { listing_id: conv.listing_id, lister_id, renter_id, [myField]: newValue },
      { onConflict: "listing_id,renter_id,lister_id" }
    );
    if (error) { console.error("match upsert:", error); return; }

    // Re-fetch fresh DB state (eliminates race conditions)
    const { data: fresh } = await supabase
      .from("matches")
      .select("*")
      .eq("listing_id", conv.listing_id)
      .eq("lister_id", lister_id)
      .eq("renter_id", renter_id)
      .single();
    if (!fresh) return;

    let result = fresh as MatchRecord;

    // Set matched_at if just became mutual
    if (fresh.renter_interested && fresh.lister_interested && !fresh.matched_at) {
      const { data: updated } = await supabase
        .from("matches")
        .update({ matched_at: new Date().toISOString() })
        .eq("id", fresh.id)
        .select()
        .single();
      if (updated) result = updated as MatchRecord;
    // Clear matched_at if one side withdrew
    } else if ((!fresh.renter_interested || !fresh.lister_interested) && fresh.matched_at) {
      const { data: updated } = await supabase
        .from("matches")
        .update({ matched_at: null })
        .eq("id", fresh.id)
        .select()
        .single();
      if (updated) result = updated as MatchRecord;
    }

    setMatches((prev) => {
      const idx = prev.findIndex((m) => m.id === result.id);
      return idx >= 0 ? prev.map((m, i) => (i === idx ? result : m)) : [...prev, result];
    });

    if (result.matched_at && !existing?.matched_at && !shownMatchIds.current.has(result.id)) {
      shownMatchIds.current.add(result.id);
      await fetchOtherProfile(conv.other_user_id);
      setCelebration({ otherUserId: conv.other_user_id, listingAddress: conv.listing_address });

      // Fire-and-forget match notification emails to both parties
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return;
        fetch("/api/notify/match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            listing_id: conv.listing_id,
            lister_id: conv.listing_user_id,
            renter_id: conv.listing_user_id === user.id ? conv.other_user_id : user.id,
            listing_address: conv.listing_address,
          }),
        }).catch(() => {});
      });
    }
  };

  // ── Reply ─────────────────────────────────────────────────────────────────

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConv || !user || sending) return;
    setSending(true);
    const content = replyText.trim();
    setReplyText("");
    const { data } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        recipient_id: selectedConv.other_user_id,
        listing_id: selectedConv.listing_id,
        content,
        sender_email: user.email,
      })
      .select("*, listing:listings(id, title, address, type, user_id)")
      .single();
    if (data) setAllMessages((prev) => [...prev, data as DbMessage]);
    setSending(false);

    // Fire-and-forget email notification to recipient
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return;
      fetch("/api/notify/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          recipient_id: selectedConv.other_user_id,
          listing_id: selectedConv.listing_id,
          listing_address: selectedConv.listing_address,
        }),
      }).catch(() => {});
    });
  };

  // ── Notifications ─────────────────────────────────────────────────────────

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadAlerts = notifications.filter((n) => !n.read).length;

  // ── Render ────────────────────────────────────────────────────────────────

  const bgStyle = {
    backgroundImage: `url('/sb1.png')`,
    backgroundSize: "cover",
    backgroundPosition: "center", backgroundAttachment: "fixed",
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex flex-col" style={bgStyle}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={bgStyle}>
      <Navbar />

      {/* Match celebration overlay */}
      {celebration && (
        <MatchModal
          otherName={otherProfiles[celebration.otherUserId] ?? "A student"}
          listingAddress={celebration.listingAddress}
          onDismiss={() => setCelebration(null)}
        />
      )}

      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 py-6 sm:py-8">
        <div className="mb-4 sm:mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-950 tracking-tight">Inbox</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-black/[0.04] rounded-xl mb-5 w-fit">
          <button
            onClick={() => setTab("messages")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              tab === "messages" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Messages
            {conversations.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                {conversations.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab("alerts"); markAllRead(); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === "alerts" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Listing alerts
            {unreadAlerts > 0 && (
              <span className="px-1.5 py-0.5 bg-black text-white rounded-full text-xs">{unreadAlerts}</span>
            )}
          </button>
        </div>

        {/* Messages tab */}
        {tab === "messages" && (
          conversations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-10 text-center">
              <p className="text-gray-400 text-sm">No messages yet.</p>
              <p className="text-gray-300 text-xs mt-1">Send a message to a listing or wait for someone to contact yours.</p>
            </div>
          ) : (
            <div
              className="flex bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden"
              style={{ height: "calc(100dvh - 220px)", minHeight: "420px" }}
            >
              {/* Left: conversation list — hidden on mobile when thread is open */}
              <div className={`${mobileShowThread ? "hidden sm:flex" : "flex"} w-full sm:w-72 flex-shrink-0 border-r border-black/[0.06] flex-col`}>
                <div className="px-4 py-2.5 border-b border-black/[0.04]">
                  <p className="text-[11px] text-gray-400 italic">Identities hidden until you match</p>
                </div>
                <div className="overflow-y-auto flex-1">
                  {conversations.map((conv) => {
                    const lastMsg = conv.messages[conv.messages.length - 1];
                    const isSelected = conv.key === selectedConvKey;
                    const isMine = lastMsg.sender_id === user?.id;
                    const match = getMatchForConv(conv);
                    const isMutualMatch = !!match?.matched_at;
                    const otherName = isMutualMatch ? (otherProfiles[conv.other_user_id] ?? "A student") : "A student";

                    return (
                      <button
                        key={conv.key}
                        onClick={() => { setSelectedConvKey(conv.key); setMobileShowThread(true); }}
                        className={`w-full text-left px-4 py-3.5 border-b border-black/[0.04] transition-colors cursor-pointer ${
                          isSelected ? "bg-gray-50" : "hover:bg-gray-50/70"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isMutualMatch && (
                              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                            )}
                            <span className="text-xs font-semibold text-gray-900 truncate">
                              {conv.listing_address}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {formatTimestamp(lastMsg.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {isMine ? "You: " : `${otherName}: `}{lastMsg.content}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: conversation thread */}
              {selectedConv ? (() => {
                const match = getMatchForConv(selectedConv);
                const iAmLister = selectedConv.listing_user_id === user?.id;
                const myInterested = match ? (iAmLister ? match.lister_interested : match.renter_interested) : false;
                const isMutualMatch = !!match?.matched_at;
                const otherName = isMutualMatch
                  ? (otherProfiles[selectedConv.other_user_id] ?? "A student")
                  : "A student";

                return (
                  <div className={`${mobileShowThread ? "flex" : "hidden sm:flex"} flex-1 flex-col min-w-0`}>
                    {/* Thread header */}
                    <div className="px-3 sm:px-5 py-3 sm:py-3.5 border-b border-black/[0.06] flex items-center justify-between flex-shrink-0 gap-2">
                      {/* Mobile back button */}
                      <button
                        onClick={() => setMobileShowThread(false)}
                        className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
                      >
                        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                          <path d="M9 11L5 7L9 3" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{selectedConv.listing_address}</p>
                        <p className="text-xs text-gray-400 capitalize mt-0.5">
                          {selectedConv.listing_type} ·{" "}
                          {isMutualMatch ? (
                            <span className="text-green-600 font-medium">{otherName}</span>
                          ) : (
                            "A student"
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        {/* Match button */}
                        <button
                          onClick={() => handleMatchToggle(selectedConv)}
                          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            isMutualMatch
                              ? "bg-green-500 text-white shadow-sm"
                              : myInterested
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                          }`}
                        >
                          <span>{isMutualMatch ? "✓" : myInterested ? "♥" : "♡"}</span>
                          <span className="hidden sm:inline">{isMutualMatch ? "Matched" : myInterested ? "Interested" : "Match"}</span>
                        </button>
                        <Link
                          href={`/browse?listing=${selectedConv.listing_id}`}
                          className="text-xs text-gray-400 hover:text-gray-700 transition-colors hidden sm:inline"
                        >
                          View →
                        </Link>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2 min-h-0">
                      {selectedConv.messages.map((msg) => {
                        const isMe = msg.sender_id === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                isMe
                                  ? "bg-black text-white rounded-br-sm"
                                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
                              }`}
                            >
                              <p>{msg.content}</p>
                              <p className={`text-[10px] mt-1 ${isMe ? "text-white/40" : "text-gray-400"}`}>
                                {isMe ? "You" : otherName} · {formatTimestamp(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={bottomRef} />
                    </div>

                    {/* Reply box */}
                    <div className="px-4 py-3 border-t border-black/[0.06] flex gap-2 flex-shrink-0">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                        placeholder="Message…"
                        className="flex-1 px-4 py-2 bg-gray-50 border border-black/[0.08] rounded-full text-sm outline-none focus:border-black/20 transition-colors"
                      />
                      <button
                        onClick={sendReply}
                        disabled={!replyText.trim() || sending}
                        className="px-4 py-2 bg-black text-white text-sm font-medium rounded-full hover:bg-gray-800 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                );
              })() : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-gray-400">Select a conversation</p>
                </div>
              )}
            </div>
          )
        )}

        {/* Alerts tab */}
        {tab === "alerts" && (
          notifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-10 text-center">
              <p className="text-gray-400 text-sm">No alerts yet.</p>
              <p className="text-gray-300 text-xs mt-1">Post a request and we&apos;ll notify you here when a matching listing is added.</p>
              <Link href="/requests" className="inline-block mt-4 px-4 py-2 bg-black text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors">
                Post a request →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {notifications.map((notif) => (
                <Link
                  key={notif.id}
                  href={`/browse?listing=${notif.listing_id}`}
                  className={`block bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-all ${notif.read ? "border-black/[0.06]" : "border-black/[0.12]"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!notif.read && <span className="w-2 h-2 rounded-full bg-black flex-shrink-0" />}
                        <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">New match for your request</span>
                      </div>
                      <p className="text-base font-semibold text-gray-900 truncate">
                        {notif.listing?.title ?? notif.listing?.address ?? `Listing #${notif.listing_id}`}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5 capitalize">
                        {notif.listing?.type} · ${notif.listing?.price?.toLocaleString()}/mo
                      </p>
                      {notif.reason && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{notif.reason}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${notif.score >= 80 ? "bg-green-100 text-green-700" : notif.score >= 65 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                        {notif.score}% match
                      </span>
                      <span className="text-xs text-gray-400">{formatTimestamp(notif.created_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
