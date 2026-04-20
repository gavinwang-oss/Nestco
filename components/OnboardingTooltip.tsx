"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "nestco_onboarding_v1";

const STEPS = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="13" stroke="#111" strokeWidth="1.5"/>
        <path d="M8 14h4m0 0l-2-2m2 2l-2 2" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13 10c0-1.1.9-2 2-2h3a2 2 0 012 2v8a2 2 0 01-2 2h-3a2 2 0 01-2-2v-8z" stroke="#111" strokeWidth="1.5"/>
        <circle cx="16.5" cy="14" r="1" fill="#111"/>
      </svg>
    ),
    title: "Tell the AI what you need",
    body: "Type anything — budget, location, roommate preferences. The AI reads your message and ranks every listing by how well it matches.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="2" y="4" width="24" height="16" rx="3" stroke="#111" strokeWidth="1.5"/>
        <path d="M9 11h10M9 15h6" stroke="#111" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M10 24l4-4 4 4" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Browse, click, message",
    body: "Click any listing to see full details and photos. Message the lister directly — no email, no third-party app.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 3l2.8 5.6 6.2.9-4.5 4.4 1.1 6.1L14 17l-5.6 3 1.1-6.1L5 9.5l6.2-.9L14 3z" stroke="#111" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9 22l1.5 3M19 22l-1.5 3" stroke="#111" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Save listings & match",
    body: "Bookmark listings as you browse. When both you and a lister are interested, you mutually match — identities are revealed and you can coordinate directly.",
  },
];

export default function OnboardingTooltip() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
        onClick={dismiss}
      />

      {/* Card */}
      <div className="fixed z-50 inset-x-4 bottom-6 sm:inset-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[360px]">
        <div className="bg-white rounded-3xl shadow-2xl p-7 flex flex-col gap-5">

          {/* Step dots */}
          <div className="flex gap-1.5 justify-center">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-black" : "w-1.5 bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Icon + text */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
              {current.icon}
            </div>
            <div>
              <p className="text-base font-bold text-gray-950 mb-1.5">{current.title}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{current.body}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={dismiss}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              Skip
            </button>
            <button
              onClick={next}
              className="px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
            >
              {step < STEPS.length - 1 ? "Next →" : "Got it"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
