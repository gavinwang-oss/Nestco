"use client";
import Navbar from "@/components/Navbar";

const bgStyle = {
  backgroundImage: `url('/sb1.png')`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col" style={bgStyle}>
      <Navbar />

      <div className="max-w-2xl mx-auto w-full px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-950 tracking-tight">About us</h1>
          <p className="text-sm text-gray-400 mt-1">Made by Berkeley students, for Berkeley students.</p>
        </div>

        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-7 space-y-6 text-sm text-gray-700 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Why we made this</h2>
            <p>
              We&apos;re a small group of UC Berkeley students who built Nestco as a free resource to help fellow students navigate housing at Berkeley. Finding a sublet here is stressful — scattered across group chats, Facebook groups, and last-minute listings — and we wanted to make it simpler.
            </p>
            <p>
              Every semester, students scramble to find or fill housing, often dealing with sketchy listings and strangers they have no way to verify on messy, decentralized platforms. We think students deserve a place built specifically for them — one that&apos;s safer, easier to use, and actually understands what it&apos;s like to look for housing as a Berkeley student.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">It&apos;s free</h2>
            <p>
              Nestco is and will stay free to use for students. We&apos;re not a property company or a startup trying to squeeze rent out of you — just students trying to help out other students. Everyone on the platform verifies with a Berkeley{" "}<span className="font-medium">.edu</span>{" "}email, so you know you&apos;re talking to real members of the community.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">Say hi</h2>
            <p>
              Have feedback, ideas, or want to help out? We&apos;d love to hear from you at{" "}
              <a href="mailto:support@nestco.ai" className="text-black underline underline-offset-2">
                support@nestco.ai
              </a>
              .
            </p>
          </section>
        </div>

        <p className="text-xs text-gray-400 mt-5 text-center">
          Go Bears. 🐻
        </p>
      </div>
    </div>
  );
}
