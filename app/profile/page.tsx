"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const bgStyle = {
  backgroundImage: `url('/sb1.png')`,
    backgroundSize: "cover",
    backgroundPosition: "center", backgroundAttachment: "fixed",
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [major, setMajor] = useState("");
  const [yearInSchool, setYearInSchool] = useState("");
  const [gender, setGender] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }

    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.name ?? "");
          setAge(data.age != null ? String(data.age) : "");
          setMajor(data.major ?? "");
          setYearInSchool(data.year_in_school ?? "");
          setGender(data.gender ?? "");
          setBio(data.bio ?? "");
          setAvatarUrl(data.avatar_url ?? "");
        }
        setFetching(false);
      });
  }, [user, loading, router]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;

    setUploading(true);
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      if (urlData?.publicUrl) {
        setAvatarUrl(urlData.publicUrl);
      }
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").upsert({
      user_id: user.id,
      name,
      age: age ? parseInt(age) : null,
      major,
      year_in_school: yearInSchool,
      race: null,
      gender,
      bio,
      avatar_url: avatarUrl,
      include_demographics: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

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

      <div className="max-w-lg mx-auto w-full px-4 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-950 tracking-tight">Your profile</h1>
          <p className="text-sm text-gray-400 mt-1">Your name is only revealed to listers after you match.</p>
        </div>

        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-5 sm:p-7">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-7">
            <button
              onClick={handleAvatarClick}
              disabled={uploading}
              className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-black/[0.08] hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
              title="Click to upload photo"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-semibold text-gray-500">
                  {initials || "?"}
                </span>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <span className="text-white text-xs">...</span>
                </div>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-2">Click to upload photo</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-black/10"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min={18}
                onKeyDown={(e) => ["e","E","+","-"].includes(e.key) && e.preventDefault()}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
              <select
                value={yearInSchool}
                onChange={(e) => setYearInSchool(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-black/10 text-gray-700"
              >
                <option value="">Year</option>
                <option>1st year</option>
                <option>2nd year</option>
                <option>3rd year</option>
                <option>4th year</option>
                <option>Graduate</option>
              </select>
            </div>
            <input
              placeholder="Major"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-black/10"
            />
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-black/10 text-gray-700"
            >
              <option value="">Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Non-binary</option>
              <option>Prefer not to say</option>
            </select>
            <div>
              <label className="block text-xs text-gray-500 mb-1 ml-0.5">About you (optional)</label>
              <textarea
                placeholder="Brief intro — your vibe, hobbies, living habits..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-black/10 resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-5 w-full py-3 min-h-[44px] bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? "Saving…" : saved ? "Saved!" : "Save"}
          </button>

          {saved && (
            <p className="text-center text-xs text-green-600 mt-2">Profile saved successfully.</p>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-5 text-center leading-relaxed">
          Your profile info can help draft introductions, but your name stays hidden until you match.
        </p>
      </div>
    </div>
  );
}
