import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

export default function Quiz() {
    const location = useLocation();
    const navigate = useNavigate();
    const quiz = location.state?.quiz;
    const questions = quiz?.soalanKuiz || [];

    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState(null);
    const [answered, setAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [done, setDone] = useState(false);
    const [results, setResults] = useState([]);

    if (!quiz || questions.length === 0) {
        return (
            <div className="page">
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                    <p>Kuiz tidak dijumpai. Sila jana kuiz daripada ringkasan.</p>
                    <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={() => navigate("/input")}>
                        ← Mulakan Semula
                    </button>
                </div>
            </div>
        );
    }

    const q = questions[current];
    const labels = ["A", "B", "C", "D"];

    const handleSelect = (option) => {
        if (answered) return;
        setSelected(option);
        setAnswered(true);
        const correct = option === q.jawapanBetul;
        if (correct) setScore(s => s + 1);
        setResults(prev => [...prev, { soalan: q.soalan, pilihan: option, jawapan: q.jawapanBetul, penjelasan: q.penjelasan, correct }]);
    };

    const handleNext = () => {
        if (current + 1 >= questions.length) {
            setDone(true);
        } else {
            setCurrent(c => c + 1);
            setSelected(null);
            setAnswered(false);
        }
    };

    const getOptionClass = (option) => {
        if (!answered) return "";
        if (option === q.jawapanBetul) return "correct";
        if (option === selected && option !== q.jawapanBetul) return "wrong";
        return "";
    };

    const percentage = Math.round((score / questions.length) * 100);

    if (done) {
        const grade =
            percentage >= 80 ? ["🏆 Cemerlang!", "var(--success)"] :
                percentage >= 60 ? ["👍 Bagus!", "var(--warning)"] :
                    ["📚 Perlu Ulang Kaji", "var(--error)"];

        return (
            <div className="page">
                <div className="card score-card">
                    <h2>Kuiz Selesai!</h2>
                    <div className="score-circle">
                        <span className="score-number">{score}/{questions.length}</span>
                        <span className="score-label">{percentage}%</span>
                    </div>
                    <h3 style={{ color: grade[1], marginBottom: "0.5rem" }}>{grade[0]}</h3>
                    <p>Anda menjawab {score} daripada {questions.length} soalan dengan betul.</p>

                    <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                        <button className="btn btn-outline" onClick={() => {
                            setCurrent(0); setScore(0); setSelected(null); setAnswered(false);
                            setDone(false); setResults([]);
                        }}>🔄 Cuba Lagi</button>
                        <Link to="/" className="btn btn-primary">🏠 Halaman Utama</Link>
                    </div>

                    {/* Results breakdown */}
                    <div style={{ marginTop: "2rem", textAlign: "left" }}>
                        <h3 style={{ marginBottom: "1rem" }}>Semakan Jawapan:</h3>
                        {results.map((r, i) => (
                            <div key={i} style={{
                                padding: "0.75rem 1rem",
                                borderRadius: "10px",
                                marginBottom: "0.5rem",
                                background: r.correct ? "rgba(76,175,117,0.1)" : "rgba(255,82,82,0.1)",
                                border: `1px solid ${r.correct ? "rgba(76,175,117,0.3)" : "rgba(255,82,82,0.3)"}`,
                                fontSize: "0.88rem"
                            }}>
                <strong>S{i + 1}:</strong> {r.correct ? "✅" : "❌"} Jawapan betul: <strong>{r.jawapan}</strong>
                                {!r.correct && r.penjelasan && (
                                    <div style={{ marginTop: "0.35rem", fontSize: "0.82rem", color: "var(--text-sub)" }}>
                                        💡 {r.penjelasan}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="step-badge">Soalan {current + 1} daripada {questions.length}</div>
            <h1>❓ Kuiz Aktif</h1>

            <div className="quiz-progress">
                <div className="quiz-progress-fill" style={{ width: `${((current) / questions.length) * 100}%` }} />
            </div>

            <div className="card">
                <p style={{ fontSize: "0.85rem", color: "var(--text-sub)", marginBottom: "0.75rem" }}>Soalan {current + 1}</p>
                <div className="quiz-question" style={{ whiteSpace: "pre-line" }}>{q.soalan}</div>

                <div className="quiz-options">
                    {q.pilihanJawapan.map((option, i) => (
                        <div
                            key={i}
                            className={`quiz-option ${getOptionClass(option)} ${selected === option ? "selected" : ""}`}
                            onClick={() => handleSelect(option)}
                        >
                            <div className="option-label">{labels[i]}</div>
                            {option}
                        </div>
                    ))}
                </div>

                {answered && (
                    <>
                        {q.penjelasan && (
                            <div style={{
                                marginTop: "1rem",
                                padding: "0.85rem 1rem",
                                borderRadius: "10px",
                                background: "rgba(99,102,241,0.08)",
                                border: "1px solid rgba(99,102,241,0.25)",
                                fontSize: "0.88rem",
                                color: "var(--text-sub)",
                                lineHeight: "1.5"
                            }}>
                                <strong style={{ color: "var(--primary)" }}>💡 Penjelasan:</strong>{" "}{q.penjelasan}
                            </div>
                        )}
                        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                            <button id="next-btn" className="btn btn-primary" onClick={handleNext}>
                                {current + 1 >= questions.length ? "Lihat Keputusan 🏆" : "Soalan Seterusnya →"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
