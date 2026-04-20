"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

const STORAGE_KEY = "nestco_swipe_tutorial_v1";

export default function SwipeTutorial() {
  const [visible, setVisible] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-14, 0, 14]);
  const saveOpacity = useTransform(x, [20, 80], [0, 1]);
  const skipOpacity = useTransform(x, [-80, -20], [1, 0]);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    const run = async () => {
      // Short pause before starting so user sees the panel first
      await new Promise((r) => setTimeout(r, 700));

      while (!cancelled) {
        // Swipe right → save
        await animate(x, 95, { duration: 0.55, ease: "easeOut" });
        if (cancelled) break;
        await new Promise((r) => setTimeout(r, 380));
        await animate(x, 0, { duration: 0.5, type: "spring", bounce: 0.45 });
        if (cancelled) break;
        await new Promise((r) => setTimeout(r, 650));

        // Swipe left → skip
        await animate(x, -95, { duration: 0.55, ease: "easeOut" });
        if (cancelled) break;
        await new Promise((r) => setTimeout(r, 380));
        await animate(x, 0, { duration: 0.5, type: "spring", bounce: 0.45 });
        if (cancelled) break;
        await new Promise((r) => setTimeout(r, 950));
      }
    };

    run();
    return () => { cancelled = true; };
  }, [visible, x]);

  function dismiss() {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[3px] cursor-pointer"
      onClick={dismiss}
    >
      {/* Labels above card */}
      <div className="flex items-center justify-between w-56 mb-3 px-1">
        <span className="text-white/60 text-xs flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          skip
        </span>
        <span className="text-white/60 text-xs flex items-center gap-1">
          save
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>

      {/* Animated placeholder card */}
      <div className="relative w-56 pointer-events-none select-none">
        <motion.div
          style={{ x, rotate }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Save overlay */}
          <motion.div
            style={{ opacity: saveOpacity }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl pointer-events-none"
          >
            <div className="bg-green-500/90 backdrop-blur-sm rounded-2xl px-5 py-2.5 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                <path d="M2 2.5C2 1.95 2.45 1.5 3 1.5H11C11.55 1.5 12 1.95 12 2.5V12.5L7 10L2 12.5V2.5Z" fill="white" stroke="white" strokeWidth="1.2"/>
              </svg>
              <span className="text-white font-bold text-sm">Saved!</span>
            </div>
          </motion.div>

          {/* Skip overlay */}
          <motion.div
            style={{ opacity: skipOpacity }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl pointer-events-none"
          >
            <div className="bg-gray-700/80 backdrop-blur-sm rounded-2xl px-5 py-2.5">
              <span className="text-white font-bold text-sm">Skip</span>
            </div>
          </motion.div>

          {/* Placeholder photo */}
          <div className="h-28 bg-gradient-to-br from-amber-100 to-orange-100" />

          {/* Placeholder text */}
          <div className="p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="h-2.5 bg-gray-200 rounded-full w-2/3" />
              <div className="h-2.5 bg-gray-200 rounded-full w-1/5" />
            </div>
            <div className="h-2 bg-gray-100 rounded-full w-1/2" />
            <div className="flex gap-1.5 mt-1">
              <div className="h-5 bg-gray-100 rounded-full w-16" />
              <div className="h-5 bg-gray-100 rounded-full w-14" />
            </div>
          </div>
        </motion.div>
      </div>

      <p className="mt-5 text-white/50 text-xs tracking-wide">Tap anywhere to try it</p>
    </div>
  );
}
