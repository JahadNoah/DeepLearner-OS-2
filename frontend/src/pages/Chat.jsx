import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";
import { MessageCircle, Send, ArrowLeft } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://deeplearner.onrender.com/api" : "/api");

export default function Chat() {
  const { id } = useParams(); // IDtranskripsi
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const noMatrik = auth.currentUser?.email?.split("@")[0] || "";
  const chatDocId = `${noMatrik}_${id}`;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [tajuk, setTajuk] = useState(location.state?.tajuk || "");
  const [loaded, setLoaded] = useState(false);
  const threadRef = useRef(null);

  // Load persisted conversation + lecture title
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "perbualan", chatDocId));
        if (!cancelled && snap.exists()) setMessages(snap.data().messages || []);
      } catch (e) { console.error(e); }
      if (!location.state?.tajuk) {
        try {
          const tx = await getDoc(doc(db, "transkripsi", id));
          if (!cancelled && tx.exists()) setTajuk(tx.data().tajuk || "");
        } catch (e) { console.error(e); }
      }
      if (!cancelled) setLoaded(true);
    };
    load();
    return () => { cancelled = true; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to the newest message
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, sending]);

  const persist = async (msgs) => {
    try {
      await setDoc(
        doc(db, "perbualan", chatDocId),
        { noMatrik, IDtranskripsi: id, messages: msgs, tarikhKemaskini: serverTimestamp() },
        { merge: true }
      );
    } catch (e) { console.error(e); }
  };

  const sendMessage = async (text) => {
    const question = (text ?? input).trim();
    if (!question || sending) return;
    setError("");
    const next = [...messages, { role: "user", text: question, ts: Date.now() }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await axios.post(`${API_URL}/chat`, {
        IDtranskripsi: id,
        noMatrik,
        question,
        history: messages.slice(-6),
      });
      const withAi = [...next, { role: "assistant", text: res.data.answer, ts: Date.now() }];
      setMessages(withAi);
      persist(withAi);
    } catch (err) {
      setError(t(lang, "chat.error"));
      persist(next); // keep the question so the thread survives; user can retry
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const starters = [t(lang, "chat.starter1"), t(lang, "chat.starter2"), t(lang, "chat.starter3")];

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <button className="proto-btn-ghost" onClick={() => navigate(-1)} style={{ padding: "8px 10px" }} aria-label={t(lang, "chat.backBtn")}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ minWidth: 0 }}>
          <div className="chat-title">{tajuk || t(lang, "chat.heading")}</div>
          <div className="chat-subtitle"><MessageCircle size={11} /> {t(lang, "chat.groundedHint")}</div>
        </div>
      </div>

      {/* Thread */}
      <div className="chat-thread" ref={threadRef}>
        <div className="chat-thread-inner">
          {messages.length === 0 && loaded && !sending ? (
            <div className="chat-empty">
              <div className="chat-empty-icon"><MessageCircle size={26} /></div>
              <h2>{t(lang, "chat.emptyHeading")}</h2>
              <p>{t(lang, "chat.emptyBody")}</p>
              <div className="chat-starters">
                {starters.map((s, i) => (
                  <button key={i} className="chat-starter" onClick={() => sendMessage(s)}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) => (
                <div key={i} className={`chat-msg ${m.role}`}>
                  <div className="chat-bubble">
                    {m.role === "assistant"
                      ? <div className="chat-markdown"><ReactMarkdown>{m.text}</ReactMarkdown></div>
                      : m.text}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="chat-msg assistant">
                  <div className="chat-bubble chat-typing" aria-label={t(lang, "chat.thinking")}>
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
            </>
          )}
          {error && <div className="chat-error">{error}</div>}
        </div>
      </div>

      {/* Composer */}
      <div className="chat-composer">
        <div className="chat-composer-inner">
          <textarea
            className="chat-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t(lang, "chat.placeholder")}
            disabled={sending}
          />
          <button
            className="chat-send"
            onClick={() => sendMessage()}
            disabled={sending || !input.trim()}
            aria-label={t(lang, "chat.send")}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
