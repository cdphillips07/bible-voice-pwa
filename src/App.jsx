import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are a wise, warm biblical counselor with deep knowledge of Scripture.
When someone asks what the Bible says about a situation or topic:
1. Give a direct, compassionate answer grounded in Scripture
2. Cite 2-3 specific Bible verses (book, chapter, verse) with their text
3. Offer brief, practical wisdom on how to apply it
4. Keep your response under 200 words — spoken and clear, not academic
5. Speak in first person as a guide, not a lecturer
Do not use markdown, bullet points, or headers. Write in natural flowing speech.`;

const STORAGE_KEY = "living-word-keys";

function loadSavedKeys() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

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
      `}</style>
    </div>
  );
}

export default function App() {
  const saved = loadSavedKeys();

  const [anthropicKey,    setAnthropicKey]    = useState(saved.anthropicKey  || "");
  const [elevenKey,       setElevenKey]       = useState(saved.elevenKey     || "");
  const [voiceId,         setVoiceId]         = useState(saved.voiceId       || "");
  const [step,            setStep]            = useState(
    saved.anthropicKey && saved.elevenKey && saved.voiceId ? "ask" : "setup"
  );

  const [question,        setQuestion]        = useState("");
  const [answer,          setAnswer]          = useState("");
  const [loading,         setLoading]         = useState(false);
  const [audioLoading,    setAudioLoading]    = useState(false);
  const [audioUrl,        setAudioUrl]        = useState(null);
  const [isRecording,     setIsRecording]     = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [inputMode,       setInputMode]       = useState("text");
  const [liveTranscript,  setLiveTranscript]  = useState("");
  const [error,           setError]           = useState("");

  const audioRef       = useRef(null);
  const recognitionRef = useRef(null);

  // Save keys to sessionStorage so they survive a page refresh
  const saveSetup = () => {
    if (!anthropicKey || !elevenKey || !voiceId) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ anthropicKey, elevenKey, voiceId }));
    setStep("ask");
  };

  const clearSetup = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStep("setup");
  };

  // Wire up Web Speech API
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
      setAnswer("");   setAudioUrl(null); setError("");
      recognitionRef.current.start();
    }
  };

  const askBible = async (q) => {
    const finalQ = (q || question).trim();
    if (!finalQ) return;
    setLoading(true); setAnswer(""); setAudioUrl(null); setError("");

    try {
      // 1️⃣ Call Anthropic directly from browser (temp/testing only)
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 600,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: finalQ }],
        }),
      });

      if (!res.ok) throw new Error(`Claude API error (${res.status}) — check your Anthropic key`);
      const data = await res.json();
      const text = data.content?.[0]?.text || "I couldn't find an answer at this time.";
      setAnswer(text);
      setLoading(false);

      // 2️⃣ Call ElevenLabs directly from browser (temp/testing only)
      setAudioLoading(true);
      const voiceRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "xi-api-key": elevenKey },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: { stability: 0.6, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true },
        }),
      });

      if (!voiceRes.ok) throw new Error(`ElevenLabs error (${voiceRes.status}) — check your ElevenLabs key and Voice ID`);
      const blob = await voiceRes.blob();
      const url  = URL.createObjectURL(blob);
      setAudioUrl(url);
      setAudioLoading(false);
      setTimeout(() => audioRef.current?.play(), 100);

    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
      setAudioLoading(false);
    }
  };

  // ── Shared styles ──
  const busy = loading || audioLoading;
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

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0d0a07 0%, #1a1208 50%, #0d0a07 100%)",
      fontFamily: "'Georgia', serif",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 20px", color: "#e8dcc8",
    }}>

      {/* Header */}
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div style={{ fontSize: 36, color: "#c9a84c", letterSpacing: 8, marginBottom: 8 }}>✦</div>
        <h1 style={{ fontSize: 28, fontWeight: 400, color: "#f0e6cc", margin: 0, letterSpacing: 3, textTransform: "uppercase" }}>
          The Living Word
        </h1>
        <p style={{ color: "#8a7a5a", fontSize: 13, margin: "6px 0 0", letterSpacing: 2 }}>
          SCRIPTURE ANSWERED IN YOUR VOICE
        </p>
      </div>

      <div style={{
        width: "100%", maxWidth: 620,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(201,168,76,0.2)",
        borderRadius: 2, padding: "36px 40px", backdropFilter: "blur(8px)",
      }}>

        {/* ══ SETUP SCREEN ══ */}
        {step === "setup" ? (
          <>
            <h2 style={{ color: "#c9a84c", fontSize: 14, letterSpacing: 3, fontWeight: 400, marginTop: 0 }}>
              API CONFIGURATION
            </h2>

            {/* Temp warning banner */}
            <div style={{
              background: "rgba(201,168,76,0.08)",
              border: "1px solid rgba(201,168,76,0.25)",
              borderRadius: 1, padding: "10px 14px", marginBottom: 20,
            }}>
              <p style={{ color: "#c9a84c", fontSize: 11, letterSpacing: 1, margin: 0, lineHeight: 1.6 }}>
                ⚠ TESTING MODE — Keys are stored in your browser session only and cleared when you close the tab. Upgrade to the full version with Netlify Functions once GitHub is resolved.
              </p>
            </div>

            {[
              { label: "Anthropic API Key",    val: anthropicKey, set: setAnthropicKey, placeholder: "sk-ant-..." },
              { label: "ElevenLabs API Key",   val: elevenKey,    set: setElevenKey,    placeholder: "Your ElevenLabs key" },
              { label: "Your Cloned Voice ID", val: voiceId,      set: setVoiceId,      placeholder: "e.g. 21m00Tcm4TlvDq8ikWAM" },
            ].map(({ label, val, set, placeholder }) => (
              <div key={label} style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 11, letterSpacing: 2, color: "#8a7a5a", marginBottom: 6 }}>
                  {label.toUpperCase()}
                </label>
                <input type="password" value={val} onChange={e => set(e.target.value)}
                  placeholder={placeholder} style={baseInput} />
              </div>
            ))}

            <button
              onClick={saveSetup}
              disabled={!anthropicKey || !elevenKey || !voiceId}
              style={seekBtn(!anthropicKey || !elevenKey || !voiceId)}
            >
              Enter the Word
            </button>
            <p style={{ fontSize: 11, color: "#5a4a2a", marginTop: 16, textAlign: "center", lineHeight: 1.6 }}>
              Keys are held in memory only — never sent to any server other than Anthropic and ElevenLabs directly.
            </p>
          </>

        ) : (
          <>
            {/* ══ ASK SCREEN ══ */}
            <h2 style={{ color: "#c9a84c", fontSize: 13, letterSpacing: 3, fontWeight: 400, marginTop: 0 }}>
              ASK THE SCRIPTURE
            </h2>

            {/* Input mode toggle */}
            {speechSupported && (
              <div style={{
                display: "flex", marginBottom: 20,
                border: "1px solid rgba(201,168,76,0.2)", borderRadius: 1, overflow: "hidden",
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
            {inputMode === "text" && (
              <>
                <p style={{ color: "#8a7a5a", fontSize: 12, lineHeight: 1.7, margin: "0 0 14px" }}>
                  What does the Bible say about a situation you're facing?
                </p>
                <textarea
                  value={question} onChange={e => setQuestion(e.target.value)}
                  placeholder="e.g. What does the Bible say when I'm feeling overwhelmed by anxiety?"
                  rows={3}
                  style={{ ...baseInput, resize: "vertical", lineHeight: 1.6 }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askBible(); } }}
                />
                <button onClick={() => askBible()} disabled={busy || !question.trim()} style={seekBtn(busy || !question.trim())}>
                  {loading ? "Seeking Scripture…" : audioLoading ? "Preparing Voice…" : "Seek the Word"}
                </button>
              </>
            )}

            {/* VOICE MODE */}
            {inputMode === "voice" && (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "#8a7a5a", fontSize: 12, lineHeight: 1.7, margin: "0 0 24px" }}>
                  {isRecording
                    ? "Listening… speak your question clearly"
                    : question
                    ? "Question captured — seek the Word or re-record"
                    : "Press the microphone and ask your question aloud"}
                </p>

                <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
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
                  <div style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 1, padding: "12px 16px", marginBottom: 16, textAlign: "left" }}>
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
                    {loading ? "Seeking Scripture…" : audioLoading ? "Preparing Voice…" : "Seek the Word"}
                  </button>
                )}
              </div>
            )}

            {/* ERROR */}
            {error && (
              <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(180,60,40,0.1)", border: "1px solid rgba(180,60,40,0.3)", borderRadius: 1, color: "#c07060", fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* ANSWER */}
            {answer && (
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(201,168,76,0.15)" }}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: "#c9a84c", marginBottom: 14 }}>THE WORD SPEAKS</div>
                <p style={{ color: "#e8dcc8", fontSize: 15, lineHeight: 1.85, margin: 0, fontStyle: "italic" }}>
                  {answer}
                </p>
                {audioUrl && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 11, letterSpacing: 2, color: "#8a7a5a", marginBottom: 10 }}>♦ SPOKEN IN YOUR VOICE</div>
                    <audio ref={audioRef} controls src={audioUrl}
                      style={{ width: "100%", filter: "invert(0.85) sepia(0.3) hue-rotate(5deg)", borderRadius: 2 }} />
                  </div>
                )}
              </div>
            )}

            <button onClick={clearSetup} style={{
              background: "none", border: "none", color: "#5a4a2a", fontSize: 11,
              letterSpacing: 2, cursor: "pointer", marginTop: 24,
              textDecoration: "underline", fontFamily: "'Georgia', serif",
            }}>
              ← RECONFIGURE
            </button>
          </>
        )}
      </div>

      <p style={{ color: "#3a2e1e", fontSize: 11, marginTop: 20, letterSpacing: 1 }}>
        Powered by Claude · ElevenLabs Voice Clone · Web Speech API
      </p>
    </div>
  );
}
