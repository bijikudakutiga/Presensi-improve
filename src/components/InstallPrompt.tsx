import { useEffect, useState } from "react";

const DISMISS_KEY = "presensi_install_prompt_dismissed";

type Platform = "android" | "ios" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua) && !(window as any).MSStream) return "ios";
  return "other";
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (navigator as any).standalone === true
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (isStandalone()) return;

    const p = detectPlatform();
    setPlatform(p);
    if (p === "other") return; // hanya tampil di HP (Android/iOS)

    setVisible(true);

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // localStorage tidak tersedia — tidak fatal, cuma akan muncul lagi nanti.
    }
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] animate-slideup">
      <div className="mx-auto max-w-md rounded-xl bg-white shadow-soft border border-line p-3.5 flex gap-3 items-start">
        <img src="/icons/01-app-icon.png" alt="" className="h-10 w-10 shrink-0 object-contain" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Silakan download aplikasi ini di HP kamu</p>
          {platform === "android" ? (
            deferredPrompt ? (
              <>
                <p className="text-xs text-ink/50 mt-0.5">Pasang di layar utama untuk akses lebih cepat.</p>
                <button className="btn-primary text-xs mt-2 px-3 py-1.5" onClick={handleInstallClick}>
                  Install Aplikasi
                </button>
              </>
            ) : (
              <p className="text-xs text-ink/50 mt-0.5">
                Ketuk menu (⋮) di browser, lalu pilih "Add to Home screen" / "Install app".
              </p>
            )
          ) : (
            <p className="text-xs text-ink/50 mt-0.5">
              Ketuk ikon <span className="font-semibold">Share</span> (kotak dengan panah ke atas) di
              bar browser, lalu pilih <span className="font-semibold">"Add to Home Screen"</span>.
            </p>
          )}
        </div>
        <button
          className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full text-ink/40 hover:bg-ink/5"
          onClick={dismiss}
          aria-label="Tutup"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
