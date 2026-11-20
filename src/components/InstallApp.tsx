"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pole-install-dismissed";

/** Registers the service worker and offers "Install app" on phones. */
export default function InstallApp() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (standalone || localStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // show our own button instead of the browser mini-bar
      setPrompt(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iPhone Safari has no install prompt: show how to add it manually
    const t = setTimeout(() => {
      if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        setIosHint(true);
        setHidden(false);
      }
    }, 0);
    const onInstalled = () => setHidden(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setHidden(true);
    setPrompt(null);
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-[2000] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-ims-amber/40 bg-ims-panel/95 p-3 shadow-2xl backdrop-blur lg:bottom-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-white">Install Pole Scanner</p>
        {iosHint ? (
          <p className="text-xs text-ims-muted">
            Tap <Share className="inline h-3.5 w-3.5" /> Share, then &quot;Add to Home Screen&quot;.
          </p>
        ) : (
          <p className="text-xs text-ims-muted">Opens full-screen from your home screen, like an app.</p>
        )}
      </div>
      {!iosHint && (
        <button onClick={install} className="btn-amber flex items-center gap-1.5 px-3 py-2 text-sm">
          <Download className="h-4 w-4" /> Install
        </button>
      )}
      <button onClick={dismiss} aria-label="Not now" className="p-1 text-ims-muted hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
