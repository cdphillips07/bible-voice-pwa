import { useState, useEffect } from "react";

export default function InstallPrompt() {
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    if (isStandalone || dismissed) return;

    // iOS detection
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isNotInStandaloneMode = !window.navigator.standalone;
    if (isIOS && isNotInStandaloneMode) {
      setShowIOSPrompt(true);
      return;
    }

    // Android / Chrome install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowAndroidPrompt(false);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowIOSPrompt(false);
    setShowAndroidPrompt(false);
    setDismissed(true);
  };

  const bannerStyle = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "linear-gradient(to top, #0d0a07, #1a1208)",
    borderTop: "1px solid rgba(201,168,76,0.3)",
    padding: "16px 20px 28px",
    zIndex: 1000,
    fontFamily: "'Georgia', serif",
  };

  if (showIOSPrompt) {
    return (
      <div style={bannerStyle}>
        <button onClick={dismiss} style={{
          position: "absolute", top: 10, right: 14,
          background: "none", border: "none", color: "#5a4a2a",
          fontSize: 18, cursor: "pointer", lineHeight: 1,
        }}>✕</button>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 28 }}>✦</div>
          <div>
            <p style={{ color: "#c9a84c", fontSize: 12, letterSpacing: 2, margin: "0 0 4px", textTransform: "uppercase" }}>
              Add to Home Screen
            </p>
            <p style={{ color: "#8a7a5a", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
              Tap the <strong style={{ color: "#e8dcc8" }}>Share</strong> button{" "}
              <span style={{ fontSize: 14 }}>⬆</span> at the bottom of your browser,
              then tap <strong style={{ color: "#e8dcc8" }}>"Add to Home Screen"</strong> to install.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showAndroidPrompt) {
    return (
      <div style={bannerStyle}>
        <button onClick={dismiss} style={{
          position: "absolute", top: 10, right: 14,
          background: "none", border: "none", color: "#5a4a2a",
          fontSize: 18, cursor: "pointer", lineHeight: 1,
        }}>✕</button>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 28 }}>✦</div>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#c9a84c", fontSize: 12, letterSpacing: 2, margin: "0 0 4px", textTransform: "uppercase" }}>
              Install The Living Word
            </p>
            <p style={{ color: "#8a7a5a", fontSize: 12, margin: 0 }}>
              Add to your home screen for quick access
            </p>
          </div>
          <button onClick={handleAndroidInstall} style={{
            background: "#c9a84c", color: "#0d0a07",
            border: "none", padding: "8px 16px",
            fontSize: 11, letterSpacing: 2,
            fontFamily: "'Georgia', serif",
            textTransform: "uppercase",
            cursor: "pointer", borderRadius: 1,
            whiteSpace: "nowrap",
          }}>
            Install
          </button>
        </div>
      </div>
    );
  }

  return null;
}
