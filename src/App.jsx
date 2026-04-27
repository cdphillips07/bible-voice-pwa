import { useState, useRef, useEffect } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const FREE_QUESTIONS_PER_DAY = 3;
const USAGE_KEY = "lw-usage";
const SUB_KEY   = "lw-subscriber";

// ─── Usage helpers ────────────────────────────────────────────────────────────
function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function getUsage() {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { date: getTodayKey(), count: 0 };
    const data = JSON.parse(raw);
    if (data.date !== getTodayKey()) return { date: getTodayKey(), count: 0 };
    return data;
  } catch { return { date: getTodayKey(), count: 0 }; }
}

function incrementUsage() {
  const usage = getUsage();
  const updated = { date: getTodayKey(), count: usage.count + 1 };
  localStorage.setItem(USAGE_KEY, JSON.stringify(updated));
  return updated;
}

function isSubscriber() {
  try {
    const raw = localStorage.getItem(SUB_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data.active && (!data.expiresAt || new Date(data.expiresAt) > new Date());
  } catch { return false; }
}

window.activateSubscription = (months = 1) => {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);
  localStorage.setItem(SUB_KEY, JSON.stringify({ active: true, expiresAt: expiresAt.toISOString() }));
  window.location.reload();
};

// ─── Waveform ─────────────────────────────────────────────────────────────────
function Waveform({ active }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 20 }}>
      {[0.6, 1, 0.7, 1.2, 0.5, 0.9, 0.6].map((h, i) => (
        <div key={i} style={{
          width: 3,
          height: active ? `${h * 16}px` : "4px",
          background: active ? "#c9a84c" : "#3a2e1e",
          borderRadius: 2,
          transition: "height 0.15s ease",
          animation: active ? `wvpulse${i % 3} 0.6s ease-in-out infinite alternate` : "none",
          animationDelay: `${i * 0.08}s`,
        }} />
      ))}
      <style>{`
        @keyframes wvpulse0 { from { height: 4px } to { height: 14px } }
        @keyframes wvpulse1 { from { height: 6px } to { height: 18px } }
        @keyframes wvpulse2 { from { height: 3px } to { height: 10px } }
        @keyframes ripple {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0;   }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "#c9a84c",
          animation: "pulse 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

// ─── Paywall ──────────────────────────────────────────────────────────────────
function Paywall({ onClose, onSubscribe }) {
  const [selectedPlan, setSelectedPlan] = useState("yearly");

  const plans = [
    {
      id: "yearly",  label: "Annual",  price: "$69.99",
      period: "per year", perMonth: "$5.83/mo",
      badge: "BEST VALUE", savings: "Save 42%",
    },
    {
      id: "monthly", label: "Monthly", price: "$9.99",
      period: "per month", perMonth: null, badge: null, savings: null,
    },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", backdropFilter: "blur(8px)",
    }}>
      <div style={{
        width: "100%", maxWidth: 480,
        background: "linear-gradient(160deg, #0d0a07, #1a1208)",
        border: "1px solid rgba(201,168,76,0.3)",
        borderRadius: 4, padding: "40px 36px",
        fontFamily: "'Georgia', serif", position: "relative",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16,
          background: "none", border: "none",
          color: "#5a4a2a", fontSize: 20, cursor: "pointer",
        }}>✕</button>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 32, color: "#c9a84c", marginBottom: 10 }}>✦</div>
          <h2 style={{ color: "#f0e6cc", fontSize: 22, fontWeight: 400, margin: "0 0 8px", letterSpacing: 2 }}>
            Unlock The Living Word
          </h2>
          <p style={{ color: "#8a7a5a", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            You've used your 3 free questions for today.
            Subscribe for unlimited Scripture guidance.
          </p>
        </div>

        <div style={{ marginBottom: 24 }}>
          {[
            "Unlimited Bible questions every day",
            "Answers spoken in a warm personal voice",
            "Type or speak your questions",
            "New topics and features added regularly",
          ].map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ color: "#c9a84c", fontSize: 14, flexShrink: 0 }}>✦</div>
              <p style={{ color: "#e8dcc8", fontSize: 13, margin: 0 }}>{f}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {plans.map((plan) => (
            <div key={plan.id} onClick={() => setSelectedPlan(plan.id)} style={{
              flex: 1,
              border: `2px solid ${selectedPlan === plan.id ? "#c9a84c" : "rgba(201,168,76,0.2)"}`,
              borderRadius: 3, padding: "14px 12px", cursor: "pointer",
              background: selectedPlan === plan.id ? "rgba(201,168,76,0.08)" : "transparent",
              transition: "all 0.2s", position: "relative", textAlign: "center",
            }}>
              {plan.badge && (
                <div style={{
                  position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                  background: "#c9a84c", color: "#0d0a07",
                  fontSize: 9, letterSpacing: 1, padding: "2px 8px",
                  borderRadius: 10, whiteSpace: "nowrap",
                }}>{plan.badge}</div>
              )}
              <div style={{ color: "#c9a84c", fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>
                {plan.label.toUpperCase()}
              </div>
              <div style={{ color: "#f0e6cc", fontSize: 22, fontWeight: 400, marginBottom: 2 }}>
                {plan.price}
              </div>
              <div style={{ color: "#8a7a5a", fontSize: 11 }}>{plan.period}</div>
              {plan.perMonth && <div style={{ color: "#c9a84c", fontSize: 11, marginTop: 4 }}>{plan.perMonth}</div>}
              {plan.savings  && <div style={{ color: "#8a7a5a", fontSize: 10, marginTop: 2 }}>{plan.savings}</div>}
            </div>
          ))}
        </div>

        <button onClick={() => onSubscribe(selectedPlan)} style={{
          width: "100%", padding: "14px",
          background: "#c9a84c", color: "#0d0a07",
          border: "none", fontSize: 13, letterSpacing: 3,
          fontFamily: "'Georgia', serif", textTransform: "uppercase",
          cursor: "pointer", borderRadius: 2, marginBottom: 12,
        }}>
          {selectedPlan === "yearly" ? "Subscribe — $69.99/year" : "Subscribe — $9.99/month"}
        </button>

        <p style={{ color: "#3a2e1e", fontSize: 10, textAlign: "center", margin: 0, lineHeight: 1.6, letterSpacing: 1 }}>
          Cancel anytime · Secure payment · Billed through Stripe
        </p>
      </div>
    </div>
  );
}

// ─── Usage Badge ──────────────────────────────────────────────────────────────
function UsageBadge({ count, subscribed }) {
  if (subscribed) {
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "rgba(201,168,76,0.1)",
        border: "1px solid rgba(201,168,76,0.25)",
        borderRadius: 20, padding: "4px 12px", marginBottom: 20,
      }}>
        <span style={{ color: "#c9a84c", fontSize: 11 }}>✦</span>
        <span style={{ color: "#c9a84c", fontSize: 11, letterSpacing: 1 }}>UNLIMITED ACCESS</span>
      </div>
    );
  }
  const remaining = Math.max(0, FREE_QUESTIONS_PER_DAY - count);
  const color = remaining === 0 ? "#c07060" : remaining === 1 ? "#c9a84c" : "#8a7a5a";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${color}40`,
      borderRadius: 20, padding: "4px 12px", marginBottom: 20,
    }}>
      <span style={{ color, fontSize: 11, letterSpacing: 1 }}>
        {remaining === 0
          ? "NO FREE QUESTIONS REMAINING TODAY"
          : `${remaining} FREE QUESTION${remaining !== 1 ? "S" : ""} REMAINING TODAY`}
      </span>
    </div>
  );
}

// ─── Loading status line ──────────────────────────────────────────────────────
function LoadingStatus({ loading, audioLoading }) {
  if (!loading && !audioLoading) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      marginTop: 20, padding: "12px 16px",
      background: "rgba(201,168,76,0.04)",
      border: "1px solid rgba(201,168,76,0.1)",
      borderRadius: 1,
      animation: "fadeIn 0.3s ease",
    }}>
      <TypingDots />
      <span style={{ color: "#8a7a5a", fontSize: 12, letterSpacing: 1 }}>
        {loading ? "SEEKING SCRIPTURE…" : "PREPARING YOUR VOICE…"}
      </span>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [question,        setQuestion]        = useState("");
  const [answer,          setAnswer]          = useState("");
  const [displayedAnswer, setDisplayedAnswer] = useState("");
  const [loading,         setLoading]         = useState(false);
  const [audioLoading,    setAudioLoading]    = useState(false);
  const [audioUrl,        setAudioUrl]        = useState(null);
  const [isRecording,     setIsRecording]     = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [inputMode,       setInputMode]       = useState("text");
  const [liveTranscript,  setLiveTranscript]  = useState("");
  const [error,           setError]           = useState("");
  const [showPaywall,     setShowPaywall]      = useState(false);
  const [usage,           setUsage]           = useState(getUsage());
  const [subscribed,      setSubscribed]      = useState(isSubscriber());

  const audioRef       = useRef(null);
  const recognitionRef = useRef(null);

  // ── Typewriter effect for answer display ──
  useEffect(() => {
    if (!answer) { setDisplayedAnswer(""); return; }
    setDisplayedAnswer("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedAnswer(answer.slice(0, i + 1));
      i++;
      if (i >= answer.length) clearInterval(interval);
    }, 18); // ~18ms per character feels natural
    return () => clearInterval(interval);
  }, [answer]);

  // ── Web Speech API ──
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSpeechSupported(true);
    const rec = new SR();
    rec.continuous     = false;
    rec.interimResults = true;
    rec.lang           = "en-US";
    rec.onstart  = () => { setIsRecording(true); setLiveTranscript(""); };
    rec.onend    = () => setIsRecording(false);
    rec.onerror  = () => setIsRecording(false);
    rec.onresult = (e) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setLiveTranscript(final || interim);
      if (final) setQuestion(final);
    };
    recognitionRef.current = rec;
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setQuestion(""); setLiveTranscript("");
      setAnswer(""); setAudioUrl(null); setError("");
      recognitionRef.current.start();
    }
  };

  // ── Core ask flow with parallel loading ──
  const askBible = async (q) => {
    const finalQ = (q || question).trim();
    if (!finalQ) return;

    if (!subscribed) {
      const currentUsage = getUsage();
      if (currentUsage.count >= FREE_QUESTIONS_PER_DAY) {
        setShowPaywall(true);
        return;
      }
    }

    setLoading(true);
    setAnswer(""); setAudioUrl(null); setError("");

    if (!subscribed) {
      const newUsage = incrementUsage();
      setUsage(newUsage);
      if (newUsage.count >= FREE_QUESTIONS_PER_DAY) {
        setTimeout(() => setShowPaywall(true), 5000);
      }
    }

    try {
      // 1️⃣ Fetch text answer
      const askRes = await fetch("/.netlify/functions/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: finalQ }),
      });
      if (!askRes.ok) throw new Error(`Scripture fetch failed (${askRes.status})`);
      const { answer: text } = await askRes.json();

      // 2️⃣ Show text AND fire audio request IN PARALLEL
      setAnswer(text);
      setLoading(false);
      setAudioLoading(true);

      // Audio fires immediately — doesn't wait for typewriter to finish
      const speakRes = await fetch("/.netlify/functions/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!speakRes.ok) throw new Error(`Voice synthesis failed (${speakRes.status})`);
      const { audio, contentType } = await speakRes.json();

      const binary = atob(audio);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: contentType || "audio/mpeg" });
      const url  = URL.createObjectURL(blob);

      setAudioUrl(url);
      setAudioLoading(false);

      // Auto-play as soon as audio is ready
      setTimeout(() => audioRef.current?.play(), 100);

    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
      setAudioLoading(false);
    }
  };

  const handleSubscribe = (plan) => {
    const urls = {
      monthly: "https://buy.stripe.com/your-monthly-link",
      yearly:  "https://buy.stripe.com/your-yearly-link",
    };
    window.location.href = urls[plan];
  };

  // ─── Styles ────────────────────────────────────────────────────────────────
  const busy     = loading || audioLoading;
  const hitLimit = !subscribed && usage.count >= FREE_QUESTIONS_PER_DAY;

  const baseInput = {
    width: "100%", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(201,168,76,0.25)", borderRadius: 1,
    padding: "10px 14px", color: "#e8dcc8", fontSize: 14,
    outline: "none", boxSizing: "border-box", fontFamily: "'Georgia', serif",
  };

  const seekBtn = (disabled) => ({
    width: "100%", marginTop: 12,
    background: disabled ? "rgba(201,168,76,0.15)" : "#c9a84c",
    color:      disabled ? "#5a4a2a"               : "#0d0a07",
    border: "none", padding: "13px", fontSize: 12, letterSpacing: 3,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'Georgia', serif", textTransform: "uppercase",
    borderRadius: 1, transition: "all 0.3s",
  });

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {showPaywall && (
        <Paywall
          onClose={() => setShowPaywall(false)}
          onSubscribe={handleSubscribe}
        />
      )}

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0d0a07 0%, #1a1208 50%, #0d0a07 100%)",
        fontFamily: "'Georgia', serif",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 20px", color: "#e8dcc8",
      }}>

        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{ fontSize: 36, color: "#c9a84c", letterSpacing: 8, marginBottom: 8 }}>✦</div>
          <h1 style={{
            fontSize: 28, fontWeight: 400, color: "#f0e6cc",
            margin: 0, letterSpacing: 3, textTransform: "uppercase",
          }}>
            The Living Word
          </h1>
          <p style={{ color: "#8a7a5a", fontSize: 13, margin: "6px 0 0", letterSpacing: 2 }}>
            SCRIPTURE ANSWERED IN YOUR VOICE
          </p>
        </div>

        {/* Card */}
        <div style={{
          width: "100%", maxWidth: 620,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(201,168,76,0.2)",
          borderRadius: 2, padding: "36px 40px",
          backdropFilter: "blur(8px)",
        }}>
          <h2 style={{
            color: "#c9a84c", fontSize: 13, letterSpacing: 3,
            fontWeight: 400, marginTop: 0, marginBottom: 16,
          }}>
            ASK THE SCRIPTURE
          </h2>

          <div style={{ textAlign: "center" }}>
            <UsageBadge count={usage.count} subscribed={subscribed} />
          </div>

          {/* Hit limit banner */}
          {hitLimit && (
            <div style={{
              background: "rgba(201,168,76,0.06)",
              border: "1px solid rgba(201,168,76,0.2)",
              borderRadius: 2, padding: "20px",
              textAlign: "center", marginBottom: 20,
            }}>
              <p style={{ color: "#c9a84c", fontSize: 13, margin: "0 0 14px", lineHeight: 1.7 }}>
                You've reached your 3 free questions for today.
                Subscribe for unlimited access to Scripture guidance.
              </p>
              <button onClick={() => setShowPaywall(true)} style={{
                background: "#c9a84c", color: "#0d0a07",
                border: "none", padding: "10px 28px",
                fontSize: 11, letterSpacing: 3,
                fontFamily: "'Georgia', serif",
                textTransform: "uppercase",
                cursor: "pointer", borderRadius: 1,
              }}>
                View Plans
              </button>
            </div>
          )}

          {/* Input mode toggle */}
          {speechSupported && !hitLimit && (
            <div style={{
              display: "flex", marginBottom: 20,
              border: "1px solid rgba(201,168,76,0.2)",
              borderRadius: 1, overflow: "hidden",
            }}>
              {[{ id: "text", label: "⌨  Type" }, { id: "voice", label: "🎙  Speak" }].map((m) => (
                <button key={m.id} onClick={() => setInputMode(m.id)} style={{
                  flex: 1, padding: "9px",
                  background: inputMode === m.id ? "rgba(201,168,76,0.15)" : "transparent",
                  color:      inputMode === m.id ? "#c9a84c"               : "#5a4a2a",
                  border: "none", fontSize: 11, letterSpacing: 2,
                  cursor: "pointer", fontFamily: "'Georgia', serif",
                  textTransform: "uppercase", transition: "all 0.2s",
                }}>{m.label}</button>
              ))}
            </div>
          )}

          {/* TEXT MODE */}
          {inputMode === "text" && !hitLimit && (
            <>
              <p style={{ color: "#8a7a5a", fontSize: 12, lineHeight: 1.7, margin: "0 0 14px" }}>
                What does the Bible say about a situation you're facing?
              </p>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What does the Bible say when I'm feeling overwhelmed by anxiety?"
                rows={3}
                style={{ ...baseInput, resize: "vertical", lineHeight: 1.6 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askBible(); }
                }}
              />
              <button
                onClick={() => askBible()}
                disabled={busy || !question.trim()}
                style={seekBtn(busy || !question.trim())}
              >
                {loading ? "Seeking…" : audioLoading ? "Preparing Voice…" : "Seek the Word"}
              </button>
            </>
          )}

          {/* VOICE MODE */}
          {inputMode === "voice" && !hitLimit && (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#8a7a5a", fontSize: 12, lineHeight: 1.7, margin: "0 0 24px" }}>
                {isRecording
                  ? "Listening… speak your question clearly"
                  : question
                  ? "Question captured — seek the Word or re-record"
                  : "Press the microphone and ask your question aloud"}
              </p>

              <div style={{
                position: "relative", display: "inline-flex",
                alignItems: "center", justifyContent: "center", marginBottom: 16,
              }}>
                {isRecording && (
                  <>
                    <div style={{ position: "absolute", width: 100, height: 100, borderRadius: "50%", border: "1px solid rgba(201,168,76,0.5)", animation: "ripple 1s ease-out infinite" }} />
                    <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", border: "1px solid rgba(201,168,76,0.2)", animation: "ripple 1s ease-out infinite 0.3s" }} />
                  </>
                )}
                <button onClick={toggleRecording} disabled={busy} style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: isRecording ? "rgba(180,60,40,0.2)" : "rgba(201,168,76,0.08)",
                  border: `2px solid ${isRecording ? "#c0402a" : "rgba(201,168,76,0.35)"}`,
                  fontSize: 30, cursor: busy ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.3s", position: "relative", zIndex: 1,
                }}>
                  {isRecording ? "⏹" : "🎙"}
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <Waveform active={isRecording} />
              </div>

              {(liveTranscript || question) && (
                <div style={{
                  background: "rgba(201,168,76,0.05)",
                  border: "1px solid rgba(201,168,76,0.15)",
                  borderRadius: 1, padding: "12px 16px", marginBottom: 16, textAlign: "left",
                }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: "#8a7a5a", marginBottom: 6 }}>
                    {isRecording ? "HEARING…" : "YOU ASKED"}
                  </div>
                  <p style={{ color: "#e8dcc8", fontSize: 14, margin: 0, fontStyle: "italic", lineHeight: 1.6 }}>
                    "{liveTranscript || question}"
                  </p>
                </div>
              )}

              {question && !isRecording && (
                <button onClick={() => askBible()} disabled={busy} style={seekBtn(busy)}>
                  {loading ? "Seeking…" : audioLoading ? "Preparing Voice…" : "Seek the Word"}
                </button>
              )}
            </div>
          )}

          {/* Loading indicator */}
          <LoadingStatus loading={loading} audioLoading={audioLoading} />

          {/* ERROR */}
          {error && (
            <div style={{
              marginTop: 16, padding: "10px 14px",
              background: "rgba(180,60,40,0.1)",
              border: "1px solid rgba(180,60,40,0.3)",
              borderRadius: 1, color: "#c07060", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* ANSWER — typewriter effect */}
          {displayedAnswer && (
            <div style={{
              marginTop: 28, paddingTop: 24,
              borderTop: "1px solid rgba(201,168,76,0.15)",
              animation: "fadeIn 0.4s ease",
            }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: "#c9a84c", marginBottom: 14 }}>
                THE WORD SPEAKS
              </div>
              <p style={{
                color: "#e8dcc8", fontSize: 15, lineHeight: 1.85,
                margin: 0, fontStyle: "italic",
              }}>
                {displayedAnswer}
                {/* Blinking cursor while typing */}
                {displayedAnswer.length < answer.length && (
                  <span style={{ animation: "pulse 0.8s infinite", opacity: 0.7 }}>▌</span>
                )}
              </p>

              {audioUrl && (
                <div style={{ marginTop: 24, animation: "fadeIn 0.4s ease" }}>
                  <div style={{ fontSize: 11, letterSpacing: 2, color: "#8a7a5a", marginBottom: 10 }}>
                    ♦ SPOKEN IN YOUR VOICE
                  </div>
                  <audio
                    ref={audioRef}
                    controls
                    src={audioUrl}
                    style={{
                      width: "100%",
                      filter: "invert(0.85) sepia(0.3) hue-rotate(5deg)",
                      borderRadius: 2,
                    }}
                  />
                </div>
              )}

              {/* Show audio loading indicator while voice is being prepared */}
              {audioLoading && !audioUrl && (
                <div style={{
                  marginTop: 20, display: "flex", alignItems: "center", gap: 10,
                  color: "#5a4a2a", fontSize: 11, letterSpacing: 1,
                }}>
                  <TypingDots />
                  <span>PREPARING YOUR VOICE…</span>
                </div>
              )}
            </div>
          )}
        </div>

        <p style={{ color: "#3a2e1e", fontSize: 11, marginTop: 20, letterSpacing: 1 }}>
          Powered by Claude · ElevenLabs Voice Clone · Web Speech API
        </p>
      </div>
    </>
  );
}
