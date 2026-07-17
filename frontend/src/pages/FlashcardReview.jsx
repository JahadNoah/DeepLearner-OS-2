import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { sm2, RATING } from "../utils/sm2";
import { RotateCcw, Home, Layers, Eye } from "lucide-react";

// nextReview may arrive as a Firestore Timestamp (direct nav) or an ISO string
// (freshly generated deck passed via router state). Normalise to a JS Date.
const toDate = (v) => (v && typeof v.toDate === "function" ? v.toDate() : v ? new Date(v) : new Date(0));

export default function FlashcardReview() {
  const { id } = useParams(); // idRingkasan (the deck)
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const stateDeck = location.state?.deck;

  const [cards, setCards] = useState(null); // null = loading; [] = none due
  const [total, setTotal] = useState(0);    // total cards in the deck (for empty vs caught-up)
  const [loadError, setLoadError] = useState("");

  // Review state machine
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState([]); // { quality, interval }
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const noMatrik = auth.currentUser?.email?.split("@")[0] || "";
      let raw = [];
      if (stateDeck && stateDeck.length) {
        raw = stateDeck.map((c) => ({ ...c, id: c.idKad || c.id }));
      } else {
        try {
          const snap = await getDocs(query(collection(db, "kadImbas"), where("idRingkasan", "==", id)));
          raw = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => c.noMatrik === noMatrik);
        } catch (e) {
          console.error(e);
          if (!cancelled) setLoadError(t(lang, "flashcard.errLoad"));
        }
      }
      const now = Date.now();
      const due = raw.filter((c) => toDate(c.nextReview).getTime() <= now);
      if (!cancelled) {
        setTotal(raw.length);
        setCards(due);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRate = (quality) => {
    const card = cards[current];
    const s = sm2(card, quality);
    // Persist the new SM-2 state (fire-and-forget; review flow shouldn't block on the write).
    updateDoc(doc(db, "kadImbas", card.id), {
      easeFactor: s.easeFactor,
      interval: s.interval,
      repetitions: s.repetitions,
      nextReview: s.nextReview,
    }).catch((e) => console.error(e));

    setResults((prev) => [...prev, { quality, interval: s.interval }]);
    if (current + 1 >= cards.length) setDone(true);
    else { setCurrent((c) => c + 1); setFlipped(false); }
  };

  const handleRestudy = () => {
    setCurrent(0);
    setFlipped(false);
    setResults([]);
    setDone(false);
  };

  // ─── Loading ──────────────────────────────────────────────
  if (cards === null) {
    return (
      <div className="proto-content">
        <div className="proto-card" style={{ padding: "48px", textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  // ─── Not found (deck has no cards at all) or load error ──────
  if (loadError || total === 0) {
    return (
      <div className="proto-content">
        <div className="proto-card" style={{ maxWidth: "440px", margin: "56px auto", textAlign: "center", padding: "48px 40px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "var(--clay-accent)", color: "var(--clay-on-accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Layers size={26} />
          </div>
          <h2 style={{ fontFamily: "var(--clay-font-head)", fontSize: "18px", fontWeight: 700, color: "var(--clay-text)", margin: "0 0 8px" }}>
            {loadError || t(lang, "flashcard.notFound")}
          </h2>
          <p style={{ color: "var(--clay-text-sub)", fontSize: "13px", lineHeight: 1.6, maxWidth: "320px", margin: "0 auto 24px" }}>
            {t(lang, "proto.notFoundHint")}
          </p>
          <button className="proto-btn proto-btn-primary" onClick={() => navigate("/input")}>
            {t(lang, "flashcard.emptyCta")}
          </button>
        </div>
      </div>
    );
  }

  // ─── Caught up (deck exists, but nothing due right now) ─────
  if (cards.length === 0) {
    return (
      <div className="proto-content">
        <div className="proto-card" style={{ maxWidth: "440px", margin: "56px auto", textAlign: "center", padding: "48px 40px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
          <h2 style={{ fontFamily: "var(--proto-font)", fontSize: "20px", fontWeight: 700, color: "var(--proto-text)", margin: "0 0 8px" }}>
            {t(lang, "flashcard.caughtUpHeading")}
          </h2>
          <p style={{ color: "var(--proto-text-2)", fontSize: "13px", lineHeight: 1.6, maxWidth: "320px", margin: "0 auto 24px" }}>
            {t(lang, "flashcard.caughtUpBody")}
          </p>
          <Link to="/flashcards" className="proto-btn proto-btn-primary" style={{ textDecoration: "none" }}>
            {t(lang, "flashcard.decksBtn")}
          </Link>
        </div>
      </div>
    );
  }

  // ─── Done recap ───────────────────────────────────────────
  if (done) {
    const tally = { again: 0, hard: 0, good: 0, easy: 0 };
    results.forEach((r) => {
      if (r.quality === RATING.AGAIN) tally.again++;
      else if (r.quality === RATING.HARD) tally.hard++;
      else if (r.quality === RATING.GOOD) tally.good++;
      else if (r.quality === RATING.EASY) tally.easy++;
    });
    const minInterval = results.length ? Math.min(...results.map((r) => r.interval)) : 1;

    return (
      <div className="proto-content" style={{ maxWidth: "560px", margin: "0 auto" }}>
        <div className="proto-card" style={{ textAlign: "center", padding: "32px" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🎉</div>
          <h1 style={{ fontFamily: "var(--proto-font)", fontSize: "22px", fontWeight: 700, color: "var(--proto-text)", marginBottom: "6px" }}>
            {t(lang, "flashcard.doneHeading")}
          </h1>
          <p style={{ color: "var(--proto-text-2)", fontSize: "14px", marginBottom: "24px" }}>
            {t(lang, "flashcard.doneBody", { n: results.length })}
          </p>

          <div className="proto-stats-row" style={{ justifyContent: "center" }}>
            <div className="proto-stat-chip"><span className="proto-stat-chip-label">{t(lang, "flashcard.again")}</span><span className="proto-stat-chip-value">{tally.again}</span></div>
            <div className="proto-stat-chip"><span className="proto-stat-chip-label">{t(lang, "flashcard.hard")}</span><span className="proto-stat-chip-value">{tally.hard}</span></div>
            <div className="proto-stat-chip"><span className="proto-stat-chip-label">{t(lang, "flashcard.good")}</span><span className="proto-stat-chip-value">{tally.good}</span></div>
            <div className="proto-stat-chip"><span className="proto-stat-chip-label">{t(lang, "flashcard.easy")}</span><span className="proto-stat-chip-value">{tally.easy}</span></div>
          </div>

          <div style={{ fontSize: "13px", color: "var(--proto-text-2)", margin: "20px 0 24px" }}>
            {t(lang, "flashcard.nextReview", { n: minInterval })}
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <button className="proto-btn-outline" onClick={handleRestudy}>
              <RotateCcw size={14} /> {t(lang, "flashcard.restudyBtn")}
            </button>
            <Link to="/flashcards" className="proto-btn-outline" style={{ textDecoration: "none" }}>
              <Layers size={14} /> {t(lang, "flashcard.decksBtn")}
            </Link>
            <Link to="/app" className="proto-btn-primary" style={{ textDecoration: "none" }}>
              <Home size={14} /> {t(lang, "flashcard.homeBtn")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active review ────────────────────────────────────────
  const card = cards[current];
  const progressWidth = (current / cards.length) * 100;

  return (
    <div className="proto-content" style={{ maxWidth: "620px", margin: "0 auto" }}>
      {/* Counter + progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--proto-text)" }}>
          {t(lang, "flashcard.heading")}
        </div>
        <div style={{ fontSize: "12px", color: "var(--proto-text-3)" }}>
          {t(lang, "flashcard.cardLabel", { n: current + 1, total: cards.length })}
        </div>
      </div>
      <div className="proto-quiz-progress-bar" style={{ marginBottom: "28px" }}>
        <div className="proto-quiz-progress-fill" style={{ width: `${progressWidth}%` }} />
      </div>

      {/* Flip card */}
      <div className={`flashcard ${flipped ? "flipped" : ""}`} onClick={() => !flipped && setFlipped(true)}>
        <div className="flashcard-inner">
          <div className="flashcard-face flashcard-front">
            <div className="flashcard-text">{card.soalan}</div>
          </div>
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-text">{card.jawapan}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ marginTop: "28px" }}>
        {!flipped ? (
          <button
            className="proto-btn proto-btn-primary"
            style={{ display: "flex", margin: "0 auto", minWidth: "220px", justifyContent: "center" }}
            onClick={() => setFlipped(true)}
          >
            <Eye size={16} /> {t(lang, "flashcard.reveal")}
          </button>
        ) : (
          <div className="flashcard-ratings">
            <button className="flashcard-rating again" onClick={() => handleRate(RATING.AGAIN)}>{t(lang, "flashcard.again")}</button>
            <button className="flashcard-rating hard" onClick={() => handleRate(RATING.HARD)}>{t(lang, "flashcard.hard")}</button>
            <button className="flashcard-rating good" onClick={() => handleRate(RATING.GOOD)}>{t(lang, "flashcard.good")}</button>
            <button className="flashcard-rating easy" onClick={() => handleRate(RATING.EASY)}>{t(lang, "flashcard.easy")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
