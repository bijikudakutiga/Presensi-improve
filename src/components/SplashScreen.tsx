import { useEffect, useState } from "react";

const SHOW_DURATION_MS = 1400;
const FADE_DURATION_MS = 350;

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), SHOW_DURATION_MS);
    const t2 = setTimeout(onDone, SHOW_DURATION_MS + FADE_DURATION_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-primary to-primary-dark transition-opacity duration-300 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      <img
        src="/logo-improvehub.png"
        alt="ImproveHub"
        className="w-56 max-w-[60vw] animate-popin"
      />
      <div className="mt-6 flex gap-1.5">
        <span className="h-2 w-2 rounded-full bg-white/70 animate-pulse [animation-delay:0ms]" />
        <span className="h-2 w-2 rounded-full bg-white/70 animate-pulse [animation-delay:150ms]" />
        <span className="h-2 w-2 rounded-full bg-white/70 animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  );
}
