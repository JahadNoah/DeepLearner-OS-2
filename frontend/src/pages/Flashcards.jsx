import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";
import { Layers, Inbox } from "lucide-react";

const toDate = (v) => (v && typeof v.toDate === "function" ? v.toDate() : v ? new Date(v) : new Date(0));

export default function Flashcards() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const noMatrik = auth.currentUser?.email?.split("@")[0] || "";

  useEffect(() => {
    fetchDecks();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDecks = async () => {
    setLoading(true);
    setError("");
    try {
      const q = query(collection(db, "kadImbas"), where("noMatrik", "==", noMatrik));
      const snap = await getDocs(q);
      const cards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Group cards into decks by idRingkasan.
      const byDeck = {};
      const now = Date.now();
      for (const c of cards) {
        const key = c.idRingkasan || "unknown";
        if (!byDeck[key]) {
          byDeck[key] = { idRingkasan: key, total: 0, due: 0, earliest: toDate(c.tarikhCipta) };
        }
        byDeck[key].total += 1;
        if (toDate(c.nextReview).getTime() <= now) byDeck[key].due += 1;
        const created = toDate(c.tarikhCipta);
        if (created < byDeck[key].earliest) byDeck[key].earliest = created;
      }

      const grouped = Object.values(byDeck).sort((a, b) => b.earliest - a.earliest);
      setDecks(grouped);
    } catch (err) {
      console.error(err);
      setError(t(lang, "flashcard.errLoad"));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) =>
    d.toLocaleDateString(lang === "ms" ? "ms-MY" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="proto-content">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--proto-font)", fontSize: "24px", fontWeight: 700, color: "var(--proto-text)", marginBottom: "6px" }}>
            {t(lang, "flashcard.heading")}
          </h1>
          <p style={{ color: "var(--proto-text-2)", fontSize: "14px" }}>{t(lang, "flashcard.subtitle")}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "var(--clay-danger-tint)", border: "1px solid var(--clay-danger)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", color: "var(--clay-text)", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="proto-card" style={{ padding: "48px", textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto" }} />
        </div>
      ) : decks.length === 0 ? (
        <div className="proto-card" style={{ textAlign: "center", padding: "48px" }}>
          <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center", color: "var(--proto-text-3)" }}>
            <Inbox size={40} />
          </div>
          <h2 style={{ fontFamily: "var(--proto-font)", fontSize: "16px", fontWeight: 700, color: "var(--proto-text)", margin: "0 0 6px" }}>
            {t(lang, "flashcard.emptyHeading")}
          </h2>
          <p style={{ color: "var(--proto-text-2)", fontSize: "13px" }}>
            {t(lang, "flashcard.emptyBody")}
          </p>
          <Link to="/input" className="proto-btn-primary" style={{ textDecoration: "none", marginTop: "20px", display: "inline-flex" }}>
            {t(lang, "flashcard.emptyCta")}
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {decks.map((deck) => (
            <div key={deck.idRingkasan} className="proto-card" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px" }}>
              <Layers size={16} style={{ color: "var(--clay-link)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--proto-text)" }}>
                  {t(lang, "flashcard.deckLabel")} · {formatDate(deck.earliest)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--proto-text-2)" }}>
                  {t(lang, "flashcard.cardsCount", { n: deck.total })} · {deck.due > 0 ? t(lang, "flashcard.dueCount", { n: deck.due }) : t(lang, "flashcard.noneDue")}
                </div>
              </div>
              <button
                className={deck.due > 0 ? "proto-btn-primary" : "proto-btn-outline"}
                style={{ padding: "8px 16px", fontSize: "12px" }}
                onClick={() => navigate(`/flashcards/${deck.idRingkasan}/review`)}
              >
                {t(lang, "flashcard.reviewBtn")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
