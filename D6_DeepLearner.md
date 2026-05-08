# PEMBANGUNAN DAN PENGUJIAN SISTEM


## 1.1 PENGENALAN

Bab ini disediakan sebagai rujukan utama yang menghuraikan secara terperinci proses pembangunan, struktur, serta ciri-ciri kritikal sistem/aplikasi DeepLearner OS. Tujuan utama dokumen ini adalah untuk memberikan pemahaman menyeluruh kepada pembaca mengenai bagaimana sistem ini dibangunkan, teknologi yang digunakan, serta inovasi yang diterapkan dalam setiap modul.

Selain itu, dokumen ini juga bertujuan untuk mendokumentasikan kod-kod penting yang menjadi asas kepada operasi sistem, serta menerangkan cabaran dan penyelesaian yang dihadapi sepanjang pembangunan.

Skop dokumen ini meliputi penerangan tentang proses pembangunan sistem dari peringkat awal sehingga ke fasa implementasi, termasuk analisis keperluan, reka bentuk sistem, pembangunan modul-modul utama, integrasi komponen, serta ujian sistem. Dokumen ini juga memperincikan setiap komponen penting seperti antara muka pengguna (UI), pengurusan data, keselamatan, serta integrasi kecerdasan buatan (AI) dan pemprosesan bahasa semula jadi (NLP). Selain itu, dokumen ini turut mengaitkan penggunaan pelbagai perpustakaan dan API yang menyokong fungsi-fungsi utama sistem.

Dokumen ini berkait rapat dengan beberapa dokumen lain yang telah disediakan sebelum ini, seperti Pelan Projek, Cadangan Projek, Keperluan dan Spesifikasi Reka Bentuk, yang memberikan latar belakang dan konteks kepada pembangunan sistem ini. Sebagai contoh, dokumen Keperluan dan Spesifikasi Reka Bentuk telah menetapkan ciri-ciri utama yang perlu ada dalam sistem, manakala Pelan Projek menggariskan jadual pembangunan dan pembahagian tugas. Hasil daripada dokumen ini pula akan digunakan untuk menghasilkan dokumen-dokumen susulan seperti Antara Muka Pengguna, Kod Sumber Penuh, Pelan Ujian, dan Manual Pengguna, yang akan memudahkan proses penyelenggaraan dan penambahbaikan sistem pada masa hadapan.

Beberapa istilah, akronim, dan singkatan penting yang digunakan dalam dokumen ini adalah seperti berikut:


### 1.1.1 Jadual Istilah, Akronim Atau Singkatan Penting

**Jadual 4.1 Istilah**

| Istilah/Akronim | Definisi |
|---|---|
| UI (User Interface) | Antara muka pengguna yang membolehkan interaksi antara pengguna dan sistem. |
| AI (Artificial Intelligence) | Kecerdasan buatan yang digunakan untuk menyediakan transkripsi, ringkasan, dan penjanaan kuiz secara automatik. |
| API (Application Programming Interface) | Antara muka yang membolehkan integrasi antara sistem frontend dengan backend dan perkhidmatan luaran. |
| NLP (Natural Language Processing) | Pemprosesan bahasa semula jadi yang digunakan untuk mengekstrak kata kunci dan menjana soalan kuiz. |
| Whisper | Model AI daripada OpenAI yang digunakan untuk transkripsi audio kepada teks, menyokong pelbagai bahasa termasuk Bahasa Melayu dan Bahasa Inggeris. |
| FastAPI | Rangka kerja Python berprestasi tinggi untuk membina API backend, digunakan sebagai pelayan utama DeepLearner OS. |
| React | Perpustakaan JavaScript untuk membina antara muka pengguna yang interaktif dan responsif. |
| Vite | Alat binaan (build tool) moden untuk aplikasi web yang menyediakan pelayan pembangunan pantas dengan Hot Module Replacement (HMR). |
| Firebase | Platform backend daripada Google yang menyediakan perkhidmatan pengesahan pengguna (Authentication), penyimpanan data awan (Firestore), dan penyimpanan fail (Storage). |
| Firestore | Pangkalan data NoSQL awan daripada Google Firebase untuk penyimpanan dan sinkronisasi data masa nyata. |
| Gemini AI | Model AI generatif daripada Google yang digunakan untuk ringkasan teks dan penjanaan kuiz berkualiti tinggi. |
| Ollama | Platform untuk menjalankan model AI secara tempatan (local LLM), digunakan sebagai alternatif kepada Gemini AI. |
| spaCy | Perpustakaan NLP Python yang digunakan untuk pengekstrakan entiti dan kata kunci dalam penjanaan kuiz. |
| SSE (Server-Sent Events) | Protokol untuk menghantar kemaskini masa nyata daripada pelayan kepada pelanggan (client). |
| MCQ (Multiple Choice Question) | Soalan aneka pilihan yang dijana secara automatik daripada teks ringkasan. |


---


## 1.2 PROSES PEMBANGUNAN

### 1.2.1 Proses Pembangunan Sistem

Pembangunan sistem DeepLearner OS menggunakan pendekatan pembangunan aplikasi web moden yang berasaskan seni bina client-server. Proses pembangunan bermula dengan fasa analisis keperluan, di mana keperluan pengguna dan spesifikasi sistem dikenalpasti melalui sesi perbincangan bersama pihak berkepentingan. Seterusnya, reka bentuk sistem dilakukan dengan menghasilkan lakaran antara muka pengguna, struktur pangkalan data, serta perancangan modul-modul utama.

Pembangunan sistem dijalankan secara iteratif, di mana setiap modul dibangunkan, diuji, dan diintegrasikan secara berperingkat. Sistem ini dibahagikan kepada dua komponen utama:

- **Frontend (React + Vite):** Antara muka pengguna yang responsif dan moden, dibina menggunakan React 19 dengan Vite sebagai alat binaan. Tailwind CSS digunakan untuk gaya visual, manakala Framer Motion menyediakan animasi yang lancar.

- **Backend (FastAPI + Python):** Pelayan API yang menguruskan logik perniagaan, pemprosesan AI, dan integrasi dengan Firebase. FastAPI dipilih kerana prestasi tinggi dan sokongan asinkronus (async) yang membolehkan pemprosesan audio dan AI berjalan secara selari.

Antara teknologi utama yang digunakan ialah React untuk pembangunan UI yang responsif dan moden, Firebase Firestore untuk pengurusan data awan, OpenAI Whisper untuk transkripsi audio, serta Gemini AI dan Ollama untuk ringkasan teks dan penjanaan kuiz. Selain itu, sistem turut mengintegrasikan spaCy untuk pemprosesan bahasa semula jadi (NLP) bagi penjanaan kuiz berasaskan heuristik.


### 1.2.2 Segmen Kod Kritikal dan Menarik

#### a) Transkripsi Audio (Whisper Service) — Ciri AI Utama

Salah satu ciri paling kritikal dalam sistem ini ialah transkripsi audio menggunakan OpenAI Whisper. Kod berikut menunjukkan bagaimana WhisperService dikonfigurasikan untuk mentranskrip audio dalam pelbagai bahasa termasuk Bahasa Melayu dan Bahasa Inggeris:

```python
# backend/services/whisper_service.py

_model = None

def get_whisper_model():
    global _model
    if _model is None:
        import whisper
        model_size = os.getenv("WHISPER_MODEL", "base")
        _model = whisper.load_model(model_size)
    return _model

def transcribe_audio(audio_path: str, language: str = None) -> dict:
    model = get_whisper_model()
    transcribe_options = {}
    if language:
        transcribe_options["language"] = language
    result = model.transcribe(audio_path, **transcribe_options)
    return {
        "text": result["text"].strip(),
        "language": result.get("language", "unknown"),
    }
```

*Rajah 4.1 Rajah Kod Kritikal Transkripsi Audio (Whisper Service)*

Kod ini menggunakan corak pemuatan malas (lazy loading) di mana model Whisper hanya dimuatkan sekali pada panggilan pertama dan disimpan dalam memori untuk penggunaan seterusnya. Ini memastikan masa respons yang pantas untuk permintaan transkripsi berturut-turut.


#### b) Ringkasan Teks Berstruktur (Summarizer Service) — Pemprosesan AI Berlapis

Modul ini membolehkan sistem menghasilkan ringkasan berstruktur daripada teks transkripsi menggunakan strategi berlapis (multi-strategy). Fungsi utama di sini ialah `summarize_text`, yang akan memilih strategi terbaik yang tersedia secara automatik:

```python
# backend/services/summarizer.py

def summarize_text(text: str, max_length: int = 300, min_length: int = 80) -> str:
    lang = detect_language(text)
    cleaned = clean_text(text)

    # Strategy E — Gemini (free)
    result = summarize_text_gemini(lang, cleaned)
    if result:
        return result

    # Strategy D — Ollama/Qwen
    result = summarize_text_ollama(lang, cleaned)
    if result:
        return result

    # Strategy C — T5
    if use_t5:
        result = summarize_text_t5(text, lang, max_length, min_length)
        if result:
            return result

    # Strategy A — Extractive (guaranteed fallback)
    return extractive_summarize(text, lang, cleaned, max_sentences=10)
```

*Rajah 4.2 Rajah Kod Kritikal Ringkasan Teks Berstruktur (Summarizer Service)*

Sistem ini menggunakan empat strategi ringkasan yang diutamakan mengikut kualiti:
1. **Gemini AI** (kualiti tertinggi) — menggunakan model `gemini-1.5-flash`
2. **Ollama/Qwen** (LLM tempatan) — tidak memerlukan API key luaran
3. **T5-small** (transformer ringan) — model Hugging Face
4. **Extractive** (heuristik) — sentiasa tersedia sebagai sandaran terakhir


#### c) Penjanaan Kuiz Pintar (Quiz Generator) — NLP dan AI Hibrid

Kod ini memastikan kuiz yang dijana adalah berkualiti tinggi dengan soalan yang menguji pemikiran aras tinggi (Higher-Order Thinking Skills) berdasarkan Taksonomi Bloom:

```python
# backend/services/quiz_generator.py

def generate_quiz(summary_text: str, num_questions: int = 5) -> List[dict]:
    # Strategy B — Gemini (fast, high-quality HOT questions)
    questions = generate_quiz_gemini(summary_text, num_questions)
    if len(questions) >= num_questions:
        return questions

    # Strategy A — NLP (instant; explanations enriched in background)
    remaining = num_questions - len(questions)
    nlp_questions = generate_quiz_nlp(summary_text, remaining)

    return (questions + nlp_questions)[:num_questions]
```

*Rajah 4.3 Rajah Kod Kritikal Penjanaan Kuiz Pintar (Quiz Generator)*

Sistem kuiz menggunakan tiga jenis templat soalan:
- **Fill-in-the-blank** (40%) — mengisi tempat kosong dengan pilihan jawapan
- **Factual/Conceptual** (40%) — mengenal pasti konsep atau entiti
- **True/False** (20%) — menentukan kenyataan benar atau salah dengan mutasi pintar


#### d) Struktur Utama Aplikasi (App.jsx) — Pengurusan Navigasi dan Status

Kod dalam fail App.jsx ini berfungsi sebagai pusat kawalan aplikasi frontend, menguruskan navigasi antara semua halaman utama serta menyimpan status pengesahan pengguna semasa:

```jsx
// frontend/src/App.jsx

function ProtectedRoute({ children, user }) {
  if (user === undefined) return <div className="loading-screen"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/" replace />;
}

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
    });
    return () => unsub();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/app" /> : <Landing />} />
        <Route path="/login" element={user ? <Navigate to="/app" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/app" /> : <Register />} />
        <Route path="/app" element={
          <ProtectedRoute user={user}>
            <AppLayout user={user}><Dashboard /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/input" element={
          <ProtectedRoute user={user}>
            <AppLayout user={user}><InputPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/transcript/:id" element={...} />
        <Route path="/summary/:id" element={...} />
        <Route path="/quiz/:id" element={...} />
        <Route path="/history" element={...} />
      </Routes>
    </BrowserRouter>
  );
}
```

*Rajah 4.4 Rajah Kod Kritikal Struktur Utama Aplikasi (App.jsx) — Pengurusan Navigasi dan Status*

Komponen `ProtectedRoute` memastikan hanya pengguna yang telah log masuk boleh mengakses halaman dalaman aplikasi. Pengguna yang belum log masuk akan dialihkan secara automatik ke halaman utama (Landing page).


#### e) API Endpoint Transkripsi — Integrasi Backend Penuh

Kod berikut menunjukkan endpoint utama untuk transkripsi audio, yang menguruskan muat naik fail, pemprosesan Whisper, pembersihan teks, dan penyimpanan ke Firestore:

```python
# backend/routers/transkripsi.py

@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    noMatrik: str = Form(...),
    language: str = Form(default=None),
    job_id: str = Form(default=None),
):
    suffix = os.path.splitext(audio.filename)[-1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        await _emit("progress", {"step": "transcribing", "label": "Mentranskrip audio..."})
        result = transcribe_audio(tmp_path, language=language)

        await _emit("progress", {"step": "cleaning", "label": "Membersihkan teks..."})
        transcript_text = clean_transcript(result["text"])

        await _emit("progress", {"step": "saving", "label": "Menyimpan transkripsi..."})

        # Upload audio to Firebase Storage
        bucket = get_bucket()
        blob_name = f"audio/{noMatrik}/{uuid.uuid4()}{suffix}"
        blob = bucket.blob(blob_name)
        blob.upload_from_filename(tmp_path, content_type=audio.content_type)

        # Save transcript to Firestore
        db = get_firestore()
        doc_ref = db.collection("transkripsi").document()
        doc_ref.set({
            "IDtranskripsi": doc_ref.id,
            "noMatrik": noMatrik,
            "teksPenuh": transcript_text,
            "bahasa": detected_lang,
            "tarikhCipta": datetime.utcnow()
        })

        return {"IDtranskripsi": doc_ref.id, "teksPenuh": transcript_text}
    finally:
        os.unlink(tmp_path)
```

*Rajah 4.5 Rajah Kod Kritikal API Endpoint Transkripsi — Integrasi Backend Penuh*

Endpoint ini menggunakan Server-Sent Events (SSE) untuk menghantar kemaskini kemajuan masa nyata kepada frontend, membolehkan pengguna melihat status pemprosesan semasa transkripsi sedang berjalan.


#### f) Penjanaan Kuiz Multimodal — Sokongan Teks dan Imej

Modul ini membolehkan penjanaan kuiz daripada gabungan teks dan imej menggunakan Gemini 1.5 Flash:

```python
# backend/routers/kuiz.py

@router.post("/generate-quiz-multimodal")
async def create_quiz_multimodal(
    noMatrik: str = Form(...),
    num_questions: int = Form(5),
    teks: Optional[str] = Form(None),
    imej: Optional[UploadFile] = File(None),
    idRingkasan: Optional[str] = Form(None),
):
    if not teks and not imej:
        raise HTTPException(status_code=400,
            detail="Sediakan sekurang-kurangnya satu input: teks atau imej.")

    if imej:
        allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        if imej.content_type not in allowed:
            raise HTTPException(status_code=415,
                detail="Format imej tidak disokong.")
        image_bytes = await imej.read()
        image_mime = imej.content_type

    questions = await asyncio.to_thread(
        generate_multimodal_quiz,
        teks or "", image_bytes, image_mime, num_questions,
    )
    # Save to Firestore...
    return {"soalanKuiz": saved_questions}
```

*Rajah 4.6 Rajah Kod Kritikal Penjanaan Kuiz Multimodal — Sokongan Teks dan Imej*


---


### 1.2.3 Modul Aplikasi

**Modul Pengesahan (Authentication)** dalam sistem ini berfungsi untuk mengurus keselamatan dan akses pengguna ke dalam aplikasi. Proses pendaftaran membolehkan pengguna baharu mendaftar dengan mengisi maklumat seperti nama, e-mel, dan kata laluan. Data ini disahkan dan disimpan menggunakan Firebase Authentication. Semasa log masuk, pengguna perlu memasukkan e-mel dan kata laluan yang akan disahkan melalui Firebase Auth SDK. Sistem ini turut menyokong pemulihan kata laluan melalui e-mel. Pengguna yang telah log masuk akan dialihkan secara automatik ke halaman Dashboard, manakala pengguna yang belum log masuk akan disekat daripada mengakses halaman dalaman melalui komponen `ProtectedRoute`.

**Modul Transkripsi Audio** direka untuk menukar audio kuliah atau pembentangan kepada teks secara automatik menggunakan model OpenAI Whisper. Pengguna boleh memuat naik fail audio dalam pelbagai format (WAV, MP3, M4A) atau merakam audio secara langsung melalui antara muka. Sistem menyokong pengesanan bahasa automatik (Bahasa Melayu dan Bahasa Inggeris) serta pilihan bahasa manual. Selepas transkripsi, teks dibersihkan daripada bunyi hingar (filler words) menggunakan perkhidmatan pembersihan teks (Transcript Cleaner) yang menggunakan Ollama atau heuristik regex. Semua rekod transkripsi disimpan dalam koleksi `transkripsi` di Firestore, manakala fail audio dimuat naik ke Firebase Storage untuk rujukan semula.

**Modul Ringkasan Teks** membolehkan penjanaan ringkasan berstruktur daripada teks transkripsi. Sistem menggunakan empat strategi ringkasan yang diutamakan secara automatik: Gemini AI (kualiti tertinggi), Ollama/Qwen (LLM tempatan), T5-small (transformer), dan Extractive (heuristik). Ringkasan dihasilkan dalam format Markdown berstruktur dengan bahagian Pengenalan, Poin Utama (dengan sub-poin jika berkenaan), dan Kesimpulan. Sistem ini peka bahasa — jika input dalam Bahasa Melayu, output juga akan dalam Bahasa Melayu. Ringkasan yang dijana disimpan dalam koleksi `ringkasan` di Firestore dan dikaitkan dengan transkripsi asal.

**Modul Penjanaan Kuiz** menjana soalan aneka pilihan (MCQ) secara automatik daripada teks ringkasan. Sistem menggunakan dua strategi utama: Gemini AI untuk soalan aras tinggi berdasarkan Taksonomi Bloom, dan NLP-Enhanced (spaCy + heuristik) sebagai sandaran. Tiga jenis soalan dijana: Fill-in-the-blank, Factual/Conceptual, dan True/False dengan mutasi pintar. Sistem turut menyokong pengayaan penjelasan (explanation enrichment) secara latar belakang menggunakan Ollama atau Gemini, di mana penjelasan template digantikan dengan penjelasan pedagogi yang lebih bermakna. Semua soalan kuiz disimpan dalam koleksi `kuiz` di Firestore.

**Modul Kuiz Multimodal** membolehkan penjanaan kuiz daripada gabungan teks dan imej (slaid, rajah, carta alir) menggunakan Gemini 1.5 Flash. Pengguna boleh memuat naik imej dalam format JPEG, PNG, WEBP, atau GIF bersama teks untuk menjana soalan yang lebih kontekstual dan bermakna. Modul ini amat berguna untuk bahan pembelajaran yang mengandungi banyak elemen visual seperti slaid pembentangan dan nota bergambar.

**Modul Ekstraksi Dokumen PDF** membolehkan pengguna memuat naik fail PDF atau TXT untuk diekstrak teks daripadanya. Teks yang diekstrak disimpan dalam koleksi `transkripsi` yang sama seperti transkripsi audio, membolehkan aliran ringkasan dan kuiz berfungsi secara konsisten tanpa mengira sumber input (audio atau dokumen). Sistem menyokong fail sehingga 20 MB dengan had 50,000 aksara. Perpustakaan pdfplumber dan PyMuPDF digunakan untuk pengekstrakan teks yang tepat dan boleh dipercayai.

**Modul Sejarah dan Papan Pemuka** menyediakan paparan semua sesi pembelajaran pengguna termasuk transkripsi, ringkasan, dan kuiz yang telah dijana sebelum ini. Pengguna boleh mengakses semula mana-mana sesi untuk menyemak semula kandungan atau menjana kuiz tambahan. Papan pemuka (Dashboard) memaparkan statistik ringkas seperti bilangan sesi, kuiz yang telah dijawab, dan aktiviti terkini.

**Modul Profil dan Tetapan** membolehkan pengguna melihat maklumat akaun mereka, menukar tema aplikasi (mod gelap/terang), dan menukar bahasa antara muka antara Bahasa Melayu dan Bahasa Inggeris. Sistem i18n (internationalization) menyokong dua bahasa penuh dengan fail terjemahan yang terpisah.


### 1.2.4 Pangkalan Data Aplikasi

Sistem ini menggunakan Firebase Firestore sebagai pangkalan data utama untuk penyimpanan data secara awan (cloud) dan sinkronisasi masa nyata.

**Firebase Firestore (Pangkalan Data Cloud)**

Firestore ialah pangkalan data NoSQL yang disediakan oleh Google Firebase untuk penyimpanan data secara awan dan sinkronisasi masa nyata antara pelbagai peranti. Dalam sistem ini, Firestore digunakan untuk:

- Menyimpan data transkripsi audio dalam koleksi `transkripsi`, termasuk teks penuh, bahasa yang dikesan, URL fail audio, dan tarikh penciptaan.
- Menyimpan ringkasan yang dijana dalam koleksi `ringkasan`, dikaitkan dengan transkripsi asal melalui `IDtranskripsi`.
- Menyimpan soalan kuiz dalam koleksi `kuiz`, termasuk soalan, pilihan jawapan, jawapan betul, penjelasan, dan status pengayaan.
- Membolehkan data diakses dan dikemaskini dari mana-mana sahaja, serta menyediakan backup automatik di cloud.
- Menyokong integrasi dengan modul AI (seperti Gemini AI dan Ollama) yang memerlukan data terkini untuk pemprosesan.

Contoh penggunaan Firestore dalam sistem ini termasuklah penyimpanan rekod transkripsi setiap kali pengguna memuat naik audio atau dokumen, sinkronisasi ringkasan dan kuiz antara halaman yang berbeza, serta penyimpanan sejarah sesi pembelajaran pengguna.

**Firebase Storage (Penyimpanan Fail)**

Firebase Storage digunakan untuk menyimpan fail audio yang dimuat naik oleh pengguna serta fail dokumen PDF. Fail disimpan dalam struktur folder berdasarkan nombor matrik pengguna (contoh: `audio/{noMatrik}/{uuid}.wav`), memastikan pengasingan data antara pengguna.

**Firebase Authentication (Pengesahan Pengguna)**

Firebase Auth digunakan untuk menguruskan pendaftaran dan pengesahan pengguna. Sistem menyokong pengesahan berasaskan e-mel dan kata laluan, dengan pengurusan sesi automatik di pihak klien melalui Firebase Auth SDK.

Struktur koleksi Firestore utama:

| Koleksi | Medan Utama | Keterangan |
|---|---|---|
| transkripsi | IDtranskripsi, noMatrik, teksPenuh, bahasa, failAudio, tarikhCipta | Menyimpan teks transkripsi daripada audio atau dokumen |
| ringkasan | idRingkasan, IDtranskripsi, noMatrik, teksRingkasan, tarikhCipta | Menyimpan ringkasan yang dijana daripada transkripsi |
| kuiz | idKuiz, idRingkasan, noMatrik, soalan, pilihanJawapan, jawapanBetul, penjelasan, status, tarikhCipta | Menyimpan soalan kuiz yang dijana |


### 1.2.5 Perpustakaan Yang Digunakan

Sistem ini menggunakan pelbagai perpustakaan (libraries) dan teknologi moden untuk memastikan aplikasi berfungsi dengan lancar, selamat, dan mesra pengguna. Berikut adalah perpustakaan utama yang digunakan:

**Backend (Python):**

1. **FastAPI (fastapi==0.115.0)** — Rangka kerja API berprestasi tinggi dengan sokongan asinkronus, dokumentasi automatik (OpenAPI/Swagger), dan pengesahan data melalui Pydantic.

2. **OpenAI Whisper (openai-whisper==20231117)** — Model AI untuk transkripsi audio kepada teks, menyokong 99+ bahasa termasuk Bahasa Melayu dan Bahasa Inggeris.

3. **Google Generative AI (google-generativeai>=0.8.0)** — Perpustakaan rasmi untuk mengakses model Gemini AI, digunakan untuk ringkasan teks dan penjanaan kuiz berkualiti tinggi.

4. **Ollama (ollama>=0.3.0)** — Klien Python untuk mengakses model AI tempatan (Qwen3:8b), digunakan sebagai alternatif kepada Gemini AI apabila API key tidak tersedia.

5. **Firebase Admin SDK (firebase-admin==6.5.0)** — Untuk integrasi dengan Firebase Firestore, Firebase Storage, dan Firebase Authentication dari bahagian pelayan.

6. **spaCy** — Perpustakaan NLP untuk pengekstrakan entiti bernama (Named Entity Recognition), pengecaman POS (Part-of-Speech), dan pengekstrakan kata kunci untuk penjanaan kuiz.

7. **Transformers (transformers==4.44.2)** — Perpustakaan Hugging Face untuk menjalankan model T5-small bagi ringkasan teks.

8. **pdfplumber (pdfplumber==0.11.9) dan PyMuPDF (PyMuPDF==1.26.1)** — Untuk pengekstrakan teks daripada fail PDF dengan ketepatan tinggi.

9. **Uvicorn (uvicorn==0.30.6)** — Pelayan ASGI berprestasi tinggi untuk menjalankan aplikasi FastAPI.

10. **python-dotenv (python-dotenv==1.0.1)** — Untuk pengurusan pemboleh ubah persekitaran (.env) secara selamat.

**Frontend (JavaScript/React):**

1. **React 19 (react==19.2.0)** — Perpustakaan teras untuk membina antara muka pengguna yang interaktif dan berasaskan komponen.

2. **Vite 6 (vite==6.4.1)** — Alat binaan moden dengan Hot Module Replacement (HMR) pantas untuk pengalaman pembangunan yang lancar.

3. **React Router DOM (react-router-dom==7.13.1)** — Untuk pengurusan navigasi dan laluan (routing) dalam aplikasi SPA (Single Page Application).

4. **Firebase SDK (firebase==12.10.0)** — Untuk pengesahan pengguna dan akses Firestore dari bahagian klien.

5. **Tailwind CSS 4 (tailwindcss==4.2.1)** — Rangka kerja CSS utiliti-pertama untuk gaya visual yang responsif dan konsisten.

6. **Framer Motion (framer-motion==12.37.0)** — Untuk animasi yang lancar dan profesional pada antara muka pengguna.

7. **Lucide React (lucide-react==0.577.0)** — Koleksi ikon SVG yang ringan dan konsisten untuk antara muka pengguna.

8. **Axios (axios==1.13.6)** — Klien HTTP untuk membuat permintaan API dari frontend ke backend.

9. **jsPDF (jspdf==4.2.0)** — Untuk menjana fail PDF ringkasan yang boleh dimuat turun oleh pengguna.

10. **Three.js dan @react-three/fiber** — Untuk kesan visual 3D pada halaman utama (Landing page).


### 1.2.6 Antaramuka (front-end)

*(Sila masukkan tangkap layar (screenshot) halaman-halaman berikut:)*

1. Landing Page — halaman utama dengan video background dan panel kaca
2. Login Page — halaman log masuk dengan reka bentuk glassmorphic
3. Register Page — halaman pendaftaran dengan reka bentuk glassmorphic
4. Dashboard — papan pemuka dengan statistik ringkas
5. Input Page — halaman muat naik audio/dokumen dan rakaman
6. Transcript Page — halaman paparan transkripsi
7. Summary Page — halaman paparan ringkasan berstruktur
8. Quiz Page — halaman kuiz interaktif dengan soalan MCQ
9. History Page — halaman sejarah sesi pembelajaran


### 1.2.7 Antaramuka (back-end)

Ini adalah antaramuka bagi Firebase Console dan FastAPI Swagger untuk DeepLearner OS:

*(Sila masukkan tangkap layar berikut:)*

1. Firebase Console — Firestore Database (koleksi transkripsi, ringkasan, kuiz)
2. Firebase Console — Authentication (senarai pengguna berdaftar)
3. Firebase Console — Storage (fail audio dan dokumen)
4. FastAPI Swagger UI — dokumentasi API automatik (/docs)


---


### 1.2.8 Masalah Yang Dihadapi

Sepanjang proses pembangunan sistem ini, terdapat beberapa masalah luar jangka yang telah dihadapi. Salah satu cabaran utama ialah kerumitan dalam mengintegrasikan pelbagai teknologi AI moden seperti OpenAI Whisper untuk transkripsi audio, Gemini AI untuk ringkasan dan penjanaan kuiz, Ollama untuk LLM tempatan, serta spaCy untuk pemprosesan bahasa semula jadi. Setiap teknologi ini mempunyai dokumentasi dan keperluan integrasi yang berbeza, menyebabkan proses pembangunan menjadi lebih kompleks dan memerlukan masa tambahan untuk memahami serta menguji setiap komponen.

Selain itu, masalah keserasian (compatibility) antara versi Node.js dan pelbagai perpustakaan frontend menjadi cabaran besar. Node.js versi 24 didapati merosakkan interoperasi ESM/CJS yang menyebabkan kegagalan binaan (build failure). Penyelesaian akhirnya ialah menggunakan Node.js versi 22 melalui Homebrew. Begitu juga, versi Vite 7.x mempunyai isu picomatch ESM, dan plugin React Babel mempunyai pepijat gensync ESM, menyebabkan perlu beralih kepada `@vitejs/plugin-react-swc`.

Terdapat juga cabaran dalam mengendalikan transkripsi audio dalam Bahasa Melayu. Model Whisper kadang-kala menghasilkan teks yang mengandungi bunyi hingar (filler words) dan kesilapan ejaan yang perlu dibersihkan. Untuk mengatasi ini, perkhidmatan pembersihan teks (Transcript Cleaner) dibangunkan menggunakan Ollama dan heuristik regex untuk membersihkan teks transkripsi secara automatik.

Masalah pengurusan API key dan kos perkhidmatan AI turut menjadi cabaran. Gemini AI mempunyai had kadar (rate limits) pada peringkat percuma yang boleh menyekat penggunaan semasa pengujian intensif. Untuk mengatasi ini, sistem direka dengan strategi berlapis (fallback strategy) di mana jika Gemini tidak tersedia, Ollama atau strategi NLP tempatan akan digunakan secara automatik.

Pada peringkat awal, matlamat projek yang bercita-cita tinggi juga menjadi cabaran, terutamanya apabila ingin menggabungkan pelbagai ciri inovatif seperti transkripsi audio berbilang bahasa, ringkasan AI berstruktur, penjanaan kuiz multimodal, serta sokongan untuk kedua-dua Bahasa Melayu dan Bahasa Inggeris. Namun, dengan perancangan semula jadual pembangunan dan penetapan keutamaan ciri, modul-modul utama yang paling kritikal telah disiapkan terlebih dahulu sebelum menambah ciri-ciri tambahan secara berperingkat.

Untuk mengatasi semua cabaran ini, telah diamalkan pendekatan pembangunan secara iteratif, sentiasa menguji setiap modul secara berasingan sebelum digabungkan ke dalam sistem utama. Selain itu, penggunaan sistem kawalan versi (Git) dan dokumentasi dalaman yang konsisten telah membantu dalam mengurangkan risiko kehilangan data dan memudahkan proses debugging.


---


## 4.4 PELAN PENGUJIAN

Objektif pengujian ini adalah untuk menilai aplikasi DeepLearner OS pada tahap Sistem. Fokus utama adalah untuk mengesahkan bahawa keseluruhan aplikasi berfungsi seperti yang dijangkakan dari perspektif pengguna akhir dan untuk memastikan sistem mempunyai keupayaan untuk pulih dengan cekap daripada pelbagai senario kegagalan. Pengujian ini bertujuan untuk menjamin kualiti, kestabilan, dan kebolehpercayaan aplikasi sebelum ia digunakan dalam persekitaran sebenar.

Menetapkan Asas Pengujian — Asas pengujian untuk aplikasi ini adalah berdasarkan dokumen keperluan. Ini termasuk:

- **Keperluan Fungsian:** Dokumen yang memperincikan semua fungsi yang mesti ada pada aplikasi, seperti proses log masuk, transkripsi audio, penjanaan ringkasan, dan penjanaan kuiz. Ini akan menjadi panduan utama untuk pengujian kotak hitam.

- **Keperluan Bukan Fungsian:** Dokumen yang mentakrifkan aspek kualiti sistem seperti kebolehpercayaan, prestasi, dan keselamatan. Keperluan ini, terutamanya yang berkaitan dengan kestabilan dan integriti data, akan menjadi asas untuk pengujian pemulihan.

Berdasarkan objektif dan asas pengujian yang telah ditetapkan, pendekatan pengujian yang dipilih adalah seperti berikut:

**Jadual 4.2 Pendekatan Pengujian**

| Jenis Pengujian | Pendekatan/Teknik yang dipilih |
|---|---|
| Pengujian Berfungsi | **Pengujian Kotak Hitam:** Teknik ini dipilih kerana ia memfokuskan kepada pengesahan fungsi aplikasi dari perspektif pengguna tanpa memerlukan pengetahuan tentang kod sumber. Teknik yang akan digunakan adalah: **Pengujian Kes Penggunaan (Use Case Testing)** |
| Pengujian Tidak Berfungsi | **Pengujian Kebolehgunaan:** Teknik ini penting untuk memastikan keutuhan dan kebolehpercayaan sistem. Ia akan menguji keupayaan aplikasi untuk pulih selepas mengalami gangguan atau kegagalan. Senario yang akan diuji termasuk: Pemulihan dari Gangguan Rangkaian, Pemulihan dari Kegagalan Perkhidmatan AI, Pemulihan dari Kegagalan Sistem |

Fasa pengujian akan dianggap selesai apabila kriteria-kriteria berikut telah dipenuhi:

- Semua kes ujian kritikal bagi pengujian kotak hitam telah dilaksanakan dan mencapai kadar kelulusan 100%.
- Tiada sebarang kecacatan (bug) kritikal atau major yang belum diselesaikan.
- Dalam semua senario pengujian pemulihan, aplikasi berjaya kembali ke keadaan stabil terakhir tanpa sebarang kehilangan atau kerosakan data kritikal.
- Masa yang diambil untuk aplikasi pulih daripada kegagalan adalah dalam had yang boleh diterima (contohnya, di bawah 30 saat).
- Semua hasil pengujian telah didokumentasikan dengan lengkap.


---


## 4.5 REKA BENTUK KES UJIAN

Berdasarkan teknik reka bentuk pengujian iaitu Pengujian Kotak Hitam dan Pengujian Pemulihan, berikut adalah perincian langkah-langkah untuk setiap jenis ujian yang dipilih.

Selain itu, pengujian kes pengguna juga akan digunakan untuk memastikan setiap fungsi utama sistem diuji berdasarkan senario penggunaan sebenar oleh pengguna.


### 4.5.1 Pengujian Kotak Hitam (Fungsian)

**Prosedur dan Data Ujian:**


#### Kes Ujian 1: Log Masuk

**Jadual 4.3 Pengujian Kes Pengguna (Log Masuk)**

| Medan | Keterangan |
|---|---|
| Kes Penggunaan | Log Masuk |
| Matlamat | Memastikan sistem membenarkan pengguna yang berdaftar untuk log masuk menggunakan emel dan kata laluan yang sah. Sistem juga perlu memaparkan mesej ralat yang sesuai sekiranya maklumat yang dimasukkan tidak sah atau tidak lengkap. |
| Penerangan Ringkas | Apabila pengguna ingin mengakses aplikasi, mereka perlu memasukkan emel dan kata laluan pada halaman log masuk. Aplikasi akan menyemak sama ada kedua-dua maklumat telah diisi. Jika tidak, mesej ralat akan dipaparkan. Jika maklumat diisi, sistem akan mengesahkan kelayakan pengguna melalui Firebase Authentication. Jika pengesahan berjaya, pengguna dialihkan ke halaman Dashboard. Jika gagal, mesej ralat dipaparkan. |
| Pelakon | Pelajar (Pengguna Berdaftar) |
| Pra-syarat | 1. Pengguna telah berdaftar dalam sistem. 2. Aplikasi boleh diakses dan berfungsi dengan baik. 3. Sambungan internet tersedia. |
| Aliran Utama | 1. Pengguna membuka aplikasi dan navigasi ke halaman log masuk. 2. Pengguna memasukkan emel dan kata laluan. 3. Aplikasi menyemak sama ada kedua-dua medan telah diisi. 4. Jika diisi, sistem mengesahkan kelayakan pengguna melalui Firebase Auth. 5. Jika kelayakan sah, pengguna dialihkan ke halaman Dashboard. |
| Keadaan Selepas | Pengguna berjaya log masuk dan boleh mengakses fungsi aplikasi. Jika log masuk gagal, pengguna kekal di halaman log masuk dengan mesej ralat yang sesuai. |
| Aliran Alternatif | 3a. Salah satu atau kedua-dua medan tidak diisi. Sistem memaparkan mesej ralat "Sila isi semua medan". 4a. Emel atau kata laluan tidak sah. Sistem memaparkan mesej ralat "Emel atau kata laluan tidak sah". 4b. Akaun tidak wujud. Sistem memaparkan mesej ralat "Akaun tidak dijumpai". |


**Jadual 4.4 Keadaan Ujian dan Liputan Ujian Kes Penggunaan (Log Masuk)**

| ID Syarat Ujian | Syarat Ujian | ID Liputan Ujian | Liputan Ujian | Data Ujian |
|---|---|---|---|---|
| TCON-01-001 | Aliran Utama | TCOV-01-001 | Pengguna berjaya log masuk | Emel: user@student.edu.my, Kata Laluan: password123 |
| TCON-01-002 | Aliran Alternatif 3a: Medan tidak diisi | TCOV-01-002 | Log masuk gagal, mesej ralat "Sila isi semua medan" | Emel: (kosong), Kata Laluan: password123 |
| TCON-01-003 | Aliran Alternatif 4a: Kata laluan tidak sah | TCOV-01-003 | Log masuk gagal, mesej ralat "Emel atau kata laluan tidak sah" | Emel: user@student.edu.my, Kata Laluan: salah123 |
| TCON-01-004 | Aliran Alternatif 4b: Akaun tidak wujud | TCOV-01-004 | Log masuk gagal, mesej ralat "Akaun tidak dijumpai" | Emel: tiada@student.edu.my, Kata Laluan: password123 |


---


#### Kes Ujian 2: Pendaftaran Akaun

**Jadual 4.5 Pengujian Kes Pengguna (Pendaftaran Akaun)**

| Medan | Keterangan |
|---|---|
| Kes Penggunaan | Pendaftaran Akaun |
| Matlamat | Memastikan pengguna baharu boleh mendaftar akaun dengan mengisi semua maklumat yang diperlukan, serta memastikan semua validasi dipatuhi sebelum akaun berjaya didaftarkan ke dalam sistem. |
| Penerangan Ringkas | Apabila pengguna ingin mendaftar, pengguna perlu mengisi maklumat seperti nama, emel, dan kata laluan pada halaman pendaftaran. Sistem akan menyemak sama ada semua medan telah diisi dan melakukan validasi seperti kesepadanan kata laluan, panjang kata laluan minimum, serta semakan emel sama ada telah didaftarkan atau belum melalui Firebase Auth. Jika semua maklumat sah, akaun akan dicipta. |
| Pelakon | Pengguna Baharu (Pelajar) |
| Pra-syarat | 1. Aplikasi boleh diakses dan berfungsi dengan baik. 2. Sambungan internet tersedia. |
| Aliran Utama | 1. Pengguna membuka halaman pendaftaran. 2. Pengguna mengisi nama, emel, kata laluan, dan pengesahan kata laluan. 3. Pengguna menekan butang "Daftar". 4. Sistem menyemak semua input dan validasi. 5. Jika semua maklumat sah, sistem mencipta akaun melalui Firebase Auth dan memaparkan mesej kejayaan. |
| Keadaan Selepas | Pengguna baharu berjaya didaftarkan dan dialihkan ke halaman Dashboard. Jika pendaftaran gagal, pengguna kekal di halaman pendaftaran dengan mesej ralat yang sesuai. |
| Aliran Alternatif | 4a. Salah satu medan wajib tidak diisi. Sistem memaparkan mesej ralat "Sila isi semua maklumat yang diperlukan". 4b. Kata laluan dan pengesahan tidak sepadan. Sistem memaparkan mesej ralat "Kata laluan tidak sepadan". 4c. Kata laluan terlalu pendek. Sistem memaparkan mesej ralat "Kata laluan mestilah sekurang-kurangnya 6 aksara". 4d. Emel telah didaftarkan. Sistem memaparkan mesej ralat "Emel telah didaftarkan". |


**Jadual 4.6 Keadaan Ujian dan Liputan Ujian Kes Penggunaan (Pendaftaran Akaun)**

| ID Syarat Ujian | Syarat Ujian | ID Liputan Ujian | Liputan Ujian | Data Ujian |
|---|---|---|---|---|
| TCON-02-001 | Aliran Utama | TCOV-02-001 | Pendaftaran berjaya | Nama: Ahmad, Emel: ahmad@student.edu.my, Kata Laluan: password123, Pengesahan: password123 |
| TCON-02-002 | Aliran Alternatif 4a: Medan wajib tidak diisi | TCOV-02-002 | Pendaftaran gagal, mesej ralat "Sila isi semua maklumat yang diperlukan" | Nama: (kosong), Emel: ahmad@student.edu.my, Kata Laluan: password123, Pengesahan: password123 |
| TCON-02-003 | Aliran Alternatif 4b: Kata laluan tidak sepadan | TCOV-02-003 | Pendaftaran gagal, mesej ralat "Kata laluan tidak sepadan" | Nama: Ahmad, Emel: ahmad@student.edu.my, Kata Laluan: password123, Pengesahan: password456 |
| TCON-02-004 | Aliran Alternatif 4c: Kata laluan terlalu pendek | TCOV-02-004 | Pendaftaran gagal, mesej ralat "Kata laluan mestilah sekurang-kurangnya 6 aksara" | Nama: Ahmad, Emel: ahmad@student.edu.my, Kata Laluan: 123, Pengesahan: 123 |
| TCON-02-005 | Aliran Alternatif 4d: Emel telah didaftarkan | TCOV-02-005 | Pendaftaran gagal, mesej ralat "Emel telah didaftarkan" | Nama: Ahmad, Emel: ahmad@student.edu.my (sudah wujud), Kata Laluan: password123, Pengesahan: password123 |


---


#### Kes Ujian 3: Muat Naik Audio dan Transkripsi

**Jadual 4.7 Pengujian Kes Pengguna (Muat Naik Audio dan Transkripsi)**

| Medan | Keterangan |
|---|---|
| Kes Penggunaan | Muat Naik Audio dan Transkripsi |
| Matlamat | Memastikan aplikasi membenarkan pengguna untuk memuat naik fail audio dan mendapatkan transkripsi teks secara automatik menggunakan AI Whisper. Aplikasi perlu memaparkan kemajuan pemprosesan dan mesej ralat yang sesuai sekiranya berlaku kegagalan. |
| Penerangan Ringkas | Apabila pengguna ingin mentranskrip audio kuliah, mereka boleh memuat naik fail audio (WAV, MP3, M4A) atau merakam audio secara langsung. Aplikasi akan menghantar fail ke backend, menjalankan model Whisper untuk transkripsi, membersihkan teks, dan menyimpan hasilnya ke Firestore. Kemajuan pemprosesan dipaparkan secara masa nyata melalui SSE. |
| Pelakon | Pelajar (Pengguna Berdaftar) |
| Pra-syarat | 1. Pengguna telah log masuk ke dalam aplikasi. 2. Sambungan internet tersedia. 3. Fail audio dalam format yang disokong (WAV, MP3, M4A). |
| Aliran Utama | 1. Pengguna membuka halaman Input. 2. Pengguna memuat naik fail audio atau merakam audio secara langsung. 3. Pengguna memilih bahasa (automatik/Melayu/Inggeris) dan menekan butang "Transkripsi". 4. Aplikasi menghantar fail ke backend dan memaparkan bar kemajuan. 5. Selepas pemprosesan selesai, aplikasi memaparkan teks transkripsi dan mengalihkan pengguna ke halaman Transkripsi. |
| Keadaan Selepas | Transkripsi berjaya dijana dan disimpan. Pengguna boleh melihat teks penuh dan meneruskan ke ringkasan atau kuiz. |
| Aliran Alternatif | 3a. Fail audio terlalu panjang. Aplikasi memaparkan mesej ralat "Audio terlalu panjang". 3b. Format fail tidak disokong. Aplikasi memaparkan mesej ralat "Format audio tidak disokong". 4a. Perkhidmatan AI tidak tersedia. Aplikasi memaparkan mesej ralat "Perkhidmatan AI tidak tersedia. Sila cuba lagi kemudian". |


**Jadual 4.8 Keadaan Ujian dan Liputan Ujian Kes Penggunaan (Muat Naik Audio dan Transkripsi)**

| ID Syarat Ujian | Syarat Ujian | ID Liputan Ujian | Liputan Ujian | Data Ujian |
|---|---|---|---|---|
| TCON-03-001 | Aliran Utama | TCOV-03-001 | Transkripsi berjaya dijana | Fail: kuliah_sejarah.mp3, Bahasa: Automatik, Sambungan: Ada |
| TCON-03-002 | Aliran Alternatif 3a: Audio terlalu panjang | TCOV-03-002 | Gagal, mesej ralat "Audio terlalu panjang" | Fail: audio_3jam.mp3, Bahasa: Automatik |
| TCON-03-003 | Aliran Alternatif 3b: Format tidak disokong | TCOV-03-003 | Gagal, mesej ralat "Format audio tidak disokong" | Fail: video.avi, Bahasa: Automatik |
| TCON-03-004 | Aliran Alternatif 4a: Perkhidmatan AI tidak tersedia | TCOV-03-004 | Gagal, mesej ralat "Perkhidmatan AI tidak tersedia" | Fail: kuliah.mp3, Simulasi: AI offline |


---


#### Kes Ujian 4: Menjana Ringkasan

**Jadual 4.9 Pengujian Kes Pengguna (Menjana Ringkasan)**

| Medan | Keterangan |
|---|---|
| Kes Penggunaan | Menjana Ringkasan |
| Matlamat | Memastikan aplikasi membenarkan pengguna untuk menjana ringkasan berstruktur daripada teks transkripsi menggunakan AI. Aplikasi perlu memaparkan ringkasan dalam format Markdown yang tersusun dan membantu pemahaman pengguna. |
| Penerangan Ringkas | Selepas transkripsi dijana, pengguna boleh menekan butang "Jana Ringkasan" untuk menghasilkan ringkasan berstruktur. Sistem akan mengambil teks transkripsi dari Firestore, memproses melalui strategi ringkasan berlapis (Gemini → Ollama → T5 → Extractive), dan menyimpan hasilnya. Ringkasan dipaparkan dengan bahagian Pengenalan, Poin Utama, dan Kesimpulan. |
| Pelakon | Pelajar (Pengguna Berdaftar) |
| Pra-syarat | 1. Pengguna telah log masuk. 2. Transkripsi telah dijana dan disimpan. 3. Sambungan internet tersedia (untuk strategi Gemini/Ollama). |
| Aliran Utama | 1. Pengguna membuka halaman Transkripsi yang mengandungi teks transkripsi. 2. Pengguna menekan butang "Jana Ringkasan". 3. Aplikasi menghantar permintaan ke backend dengan ID transkripsi. 4. Backend memproses teks dan menghasilkan ringkasan berstruktur. 5. Aplikasi memaparkan ringkasan dan mengalihkan pengguna ke halaman Ringkasan. |
| Keadaan Selepas | Ringkasan berjaya dijana dan disimpan. Pengguna boleh menyemak ringkasan dan meneruskan ke penjanaan kuiz. |
| Aliran Alternatif | 3a. Teks transkripsi kosong. Aplikasi memaparkan mesej ralat "Teks transkripsi kosong". 3b. Teks transkripsi terlalu panjang. Aplikasi memaparkan mesej ralat "Teks terlalu panjang". 4a. Perkhidmatan AI tidak tersedia. Sistem menggunakan strategi Extractive sebagai sandaran dan tetap menghasilkan ringkasan. |


**Jadual 4.10 Keadaan Ujian dan Liputan Ujian Kes Penggunaan (Menjana Ringkasan)**

| ID Syarat Ujian | Syarat Ujian | ID Liputan Ujian | Liputan Ujian | Data Ujian |
|---|---|---|---|---|
| TCON-04-001 | Aliran Utama | TCOV-04-001 | Ringkasan berjaya dijana dan dipaparkan | IDtranskripsi: (sah), Sambungan: Ada |
| TCON-04-002 | Aliran Alternatif 3a: Teks kosong | TCOV-04-002 | Gagal, mesej ralat "Teks transkripsi kosong" | IDtranskripsi: (teks kosong) |
| TCON-04-003 | Aliran Alternatif 3b: Teks terlalu panjang | TCOV-04-003 | Gagal, mesej ralat "Teks terlalu panjang" | IDtranskripsi: (>50,000 aksara) |
| TCON-04-004 | Aliran Alternatif 4a: AI tidak tersedia, fallback Extractive | TCOV-04-004 | Ringkasan berjaya dijana menggunakan strategi Extractive | IDtranskripsi: (sah), Simulasi: Gemini & Ollama offline |


---


#### Kes Ujian 5: Menjana Kuiz

**Jadual 4.11 Pengujian Kes Pengguna (Menjana Kuiz)**

| Medan | Keterangan |
|---|---|
| Kes Penggunaan | Menjana Kuiz |
| Matlamat | Memastikan aplikasi membenarkan pengguna untuk menjana soalan kuiz aneka pilihan (MCQ) secara automatik daripada teks ringkasan. Soalan kuiz perlu menguji pemikiran aras tinggi dan menyediakan penjelasan yang bermakna. |
| Penerangan Ringkas | Selepas ringkasan dijana, pengguna boleh menekan butang "Jana Kuiz" untuk menghasilkan soalan MCQ. Sistem akan mengambil teks ringkasan dari Firestore, menjana soalan menggunakan Gemini AI (utama) atau NLP-Enhanced (sandaran), dan menyimpan hasilnya. Penjelasan akan diperkaya secara latar belakang jika menggunakan strategi NLP. |
| Pelakon | Pelajar (Pengguna Berdaftar) |
| Pra-syarat | 1. Pengguna telah log masuk. 2. Ringkasan telah dijana dan disimpan. 3. Sambungan internet tersedia (untuk strategi Gemini). |
| Aliran Utama | 1. Pengguna membuka halaman Ringkasan. 2. Pengguna menekan butang "Jana Kuiz". 3. Aplikasi menghantar permintaan ke backend dengan ID ringkasan. 4. Backend menjana soalan kuiz dan menyimpan ke Firestore. 5. Aplikasi memaparkan soalan kuiz secara interaktif. |
| Keadaan Selepas | Kuiz berjaya dijana dan dipaparkan. Pengguna boleh menjawab soalan dan melihat penjelasan. |
| Aliran Alternatif | 3a. Teks ringkasan kosong. Aplikasi memaparkan mesej ralat "Teks ringkasan kosong". 3b. Kandungan tidak mencukupi. Aplikasi memaparkan mesej ralat "Tidak cukup kandungan untuk menjana kuiz". 4a. Gemini tidak tersedia, strategi NLP digunakan. Kuiz berjaya dijana menggunakan spaCy + heuristik. |


**Jadual 4.12 Keadaan Ujian dan Liputan Ujian Kes Penggunaan (Menjana Kuiz)**

| ID Syarat Ujian | Syarat Ujian | ID Liputan Ujian | Liputan Ujian | Data Ujian |
|---|---|---|---|---|
| TCON-05-001 | Aliran Utama | TCOV-05-001 | Kuiz berjaya dijana dan dipaparkan | idRingkasan: (sah), Bilangan soalan: 5 |
| TCON-05-002 | Aliran Alternatif 3a: Ringkasan kosong | TCOV-05-002 | Gagal, mesej ralat "Teks ringkasan kosong" | idRingkasan: (teks kosong) |
| TCON-05-003 | Aliran Alternatif 3b: Kandungan tidak mencukupi | TCOV-05-003 | Gagal, mesej ralat "Tidak cukup kandungan untuk menjana kuiz" | idRingkasan: (teks terlalu pendek) |
| TCON-05-004 | Aliran Alternatif 4a: Gemini offline, NLP fallback | TCOV-05-004 | Kuiz berjaya dijana menggunakan NLP | idRingkasan: (sah), Simulasi: Gemini offline |


---


#### Kes Ujian 6: Muat Naik Dokumen PDF

**Jadual 4.13 Pengujian Kes Pengguna (Muat Naik Dokumen PDF)**

| Medan | Keterangan |
|---|---|
| Kes Penggunaan | Muat Naik Dokumen PDF |
| Matlamat | Memastikan aplikasi membenarkan pengguna untuk memuat naik fail PDF atau TXT dan mengekstrak teks daripadanya untuk diproses melalui aliran ringkasan dan kuiz yang sama. |
| Penerangan Ringkas | Pengguna boleh memuat naik fail PDF atau TXT sebagai alternatif kepada audio. Sistem akan mengekstrak teks menggunakan pdfplumber/PyMuPDF, menyimpan teks dalam koleksi transkripsi Firestore, dan membolehkan aliran kerja yang sama (ringkasan → kuiz). |
| Pelakon | Pelajar (Pengguna Berdaftar) |
| Pra-syarat | 1. Pengguna telah log masuk. 2. Fail dalam format PDF atau TXT. 3. Saiz fail tidak melebihi 20 MB. |
| Aliran Utama | 1. Pengguna membuka halaman Input. 2. Pengguna memilih tab "Dokumen" dan memuat naik fail PDF/TXT. 3. Aplikasi menghantar fail ke backend. 4. Backend mengekstrak teks dan menyimpan ke Firestore. 5. Aplikasi memaparkan teks yang diekstrak. |
| Keadaan Selepas | Teks berjaya diekstrak dan disimpan. Pengguna boleh meneruskan ke ringkasan dan kuiz. |
| Aliran Alternatif | 2a. Format fail tidak disokong. Aplikasi memaparkan mesej ralat "Format fail tidak disokong. Sila muat naik fail PDF atau TXT". 3a. Saiz fail melebihi had. Aplikasi memaparkan mesej ralat "Saiz fail melebihi had 20 MB". 4a. PDF tidak mengandungi teks. Aplikasi memaparkan mesej ralat "PDF tidak mengandungi teks yang boleh diekstrak". |


**Jadual 4.14 Keadaan Ujian dan Liputan Ujian Kes Penggunaan (Muat Naik Dokumen PDF)**

| ID Syarat Ujian | Syarat Ujian | ID Liputan Ujian | Liputan Ujian | Data Ujian |
|---|---|---|---|---|
| TCON-06-001 | Aliran Utama | TCOV-06-001 | Teks berjaya diekstrak daripada PDF | Fail: nota_kuliah.pdf (5 muka surat), Format: PDF |
| TCON-06-002 | Aliran Alternatif 2a: Format tidak disokong | TCOV-06-002 | Gagal, mesej ralat "Format fail tidak disokong" | Fail: gambar.jpg, Format: JPEG |
| TCON-06-003 | Aliran Alternatif 3a: Saiz fail melebihi had | TCOV-06-003 | Gagal, mesej ralat "Saiz fail melebihi had 20 MB" | Fail: besar.pdf (25 MB) |
| TCON-06-004 | Aliran Alternatif 4a: PDF tanpa teks | TCOV-06-004 | Gagal, mesej ralat "PDF tidak mengandungi teks" | Fail: imej_sahaja.pdf (scan tanpa OCR) |


---


#### Kes Ujian 7: Menjana Kuiz Multimodal

**Jadual 4.15 Pengujian Kes Pengguna (Menjana Kuiz Multimodal)**

| Medan | Keterangan |
|---|---|
| Kes Penggunaan | Menjana Kuiz Multimodal |
| Matlamat | Memastikan aplikasi membenarkan pengguna untuk menjana kuiz daripada gabungan teks dan imej (slaid, rajah, carta alir) menggunakan Gemini AI. |
| Penerangan Ringkas | Pengguna boleh memuat naik imej bersama teks untuk menjana kuiz yang lebih kontekstual. Gemini 1.5 Flash digunakan untuk menganalisis kedua-dua input dan menghasilkan soalan MCQ. |
| Pelakon | Pelajar (Pengguna Berdaftar) |
| Pra-syarat | 1. Pengguna telah log masuk. 2. Sekurang-kurangnya satu input (teks atau imej) disediakan. 3. Format imej disokong (JPEG, PNG, WEBP, GIF). |
| Aliran Utama | 1. Pengguna memilih tab "Multimodal" pada halaman kuiz. 2. Pengguna memasukkan teks dan/atau memuat naik imej. 3. Pengguna menekan butang "Jana Kuiz". 4. Sistem memproses input menggunakan Gemini AI. 5. Soalan kuiz dipaparkan. |
| Keadaan Selepas | Kuiz multimodal berjaya dijana dan dipaparkan. |
| Aliran Alternatif | 2a. Tiada input disediakan. Aplikasi memaparkan mesej ralat "Sediakan sekurang-kurangnya satu input: teks atau imej". 2b. Format imej tidak disokong. Aplikasi memaparkan mesej ralat "Format imej tidak disokong". 4a. Gemini AI tidak tersedia. Sistem menggunakan strategi NLP sebagai sandaran (teks sahaja). |


**Jadual 4.16 Keadaan Ujian dan Liputan Ujian Kes Penggunaan (Menjana Kuiz Multimodal)**

| ID Syarat Ujian | Syarat Ujian | ID Liputan Ujian | Liputan Ujian | Data Ujian |
|---|---|---|---|---|
| TCON-07-001 | Aliran Utama | TCOV-07-001 | Kuiz multimodal berjaya dijana | Teks: "Fotosintesis ialah proses...", Imej: rajah_fotosintesis.png |
| TCON-07-002 | Aliran Alternatif 2a: Tiada input | TCOV-07-002 | Gagal, mesej ralat "Sediakan sekurang-kurangnya satu input" | Teks: (kosong), Imej: (tiada) |
| TCON-07-003 | Aliran Alternatif 2b: Format imej tidak disokong | TCOV-07-003 | Gagal, mesej ralat "Format imej tidak disokong" | Teks: "Nota kuliah...", Imej: fail.bmp |
| TCON-07-004 | Aliran Alternatif 4a: Gemini offline | TCOV-07-004 | Kuiz dijana menggunakan NLP (teks sahaja) | Teks: "Nota kuliah...", Imej: slaid.png, Simulasi: Gemini offline |


---


#### Kes Ujian 8: Melihat Sejarah Sesi

**Jadual 4.17 Pengujian Kes Pengguna (Melihat Sejarah Sesi)**

| Medan | Keterangan |
|---|---|
| Kes Penggunaan | Melihat Sejarah Sesi |
| Matlamat | Memastikan aplikasi membenarkan pengguna untuk melihat semula sesi pembelajaran yang telah dilakukan sebelum ini, termasuk transkripsi, ringkasan, dan kuiz. |
| Penerangan Ringkas | Pengguna boleh membuka halaman Sejarah untuk melihat senarai semua sesi yang telah dilakukan. Setiap sesi memaparkan tarikh, tajuk, dan status (transkripsi/ringkasan/kuiz). Pengguna boleh klik pada mana-mana sesi untuk melihat butiran penuh. |
| Pelakon | Pelajar (Pengguna Berdaftar) |
| Pra-syarat | 1. Pengguna telah log masuk. 2. Sekurang-kurangnya satu sesi pembelajaran telah dilakukan. |
| Aliran Utama | 1. Pengguna membuka halaman Sejarah melalui sidebar. 2. Aplikasi memaparkan senarai sesi pembelajaran yang lalu. 3. Pengguna memilih satu sesi untuk melihat butiran. 4. Aplikasi memaparkan butiran sesi (transkripsi/ringkasan/kuiz). |
| Keadaan Selepas | Pengguna dapat melihat butiran sesi yang dipilih. |
| Aliran Alternatif | 2a. Tiada sesi dalam sejarah. Aplikasi memaparkan mesej "Tiada sejarah pembelajaran untuk dipaparkan". 4a. Berlaku ralat semasa memuatkan data. Aplikasi memaparkan mesej ralat "Gagal memuatkan data. Sila cuba lagi". |


**Jadual 4.18 Keadaan Ujian dan Liputan Ujian Kes Penggunaan (Melihat Sejarah Sesi)**

| ID Syarat Ujian | Syarat Ujian | ID Liputan Ujian | Liputan Ujian | Data Ujian |
|---|---|---|---|---|
| TCON-08-001 | Aliran Utama | TCOV-08-001 | Senarai sejarah berjaya dipaparkan | noMatrik: (pengguna aktif), Bilangan sesi: ≥1 |
| TCON-08-002 | Aliran Alternatif 2a: Tiada sejarah | TCOV-08-002 | Mesej "Tiada sejarah pembelajaran" | noMatrik: (pengguna baru tanpa sesi) |
| TCON-08-003 | Aliran Alternatif 4a: Ralat memuatkan data | TCOV-08-003 | Gagal, mesej ralat "Gagal memuatkan data" | Simulasi: Ralat rangkaian/Firestore |


---


#### Kes Ujian 9: Menukar Bahasa Antara Muka

**Jadual 4.19 Pengujian Kes Pengguna (Menukar Bahasa Antara Muka)**

| Medan | Keterangan |
|---|---|
| Kes Penggunaan | Menukar Bahasa Antara Muka |
| Matlamat | Memastikan aplikasi membenarkan pengguna untuk menukar bahasa antara muka antara Bahasa Melayu dan Bahasa Inggeris, dan semua teks dalam aplikasi bertukar dengan betul. |
| Penerangan Ringkas | Pengguna boleh menukar bahasa antara muka melalui pemilih bahasa di bar navigasi atau tetapan. Semua label, butang, mesej, dan teks statik dalam aplikasi akan bertukar mengikut bahasa yang dipilih. Pilihan bahasa disimpan dan diingat untuk sesi seterusnya. |
| Pelakon | Pelajar (Pengguna Berdaftar) |
| Pra-syarat | 1. Pengguna telah log masuk. 2. Aplikasi berfungsi dengan baik. |
| Aliran Utama | 1. Pengguna klik pada pemilih bahasa. 2. Pengguna memilih bahasa (BM/EN). 3. Semua teks antara muka bertukar ke bahasa yang dipilih. |
| Keadaan Selepas | Bahasa antara muka bertukar sepenuhnya. Pilihan bahasa disimpan. |
| Aliran Alternatif | (Tiada aliran alternatif — fungsi ini sentiasa berjaya) |


**Jadual 4.20 Keadaan Ujian dan Liputan Ujian Kes Penggunaan (Menukar Bahasa Antara Muka)**

| ID Syarat Ujian | Syarat Ujian | ID Liputan Ujian | Liputan Ujian | Data Ujian |
|---|---|---|---|---|
| TCON-09-001 | Aliran Utama (BM → EN) | TCOV-09-001 | Bahasa bertukar dari BM ke EN, semua label dikemaskini | Bahasa asal: BM, Bahasa baru: EN |
| TCON-09-002 | Aliran Utama (EN → BM) | TCOV-09-002 | Bahasa bertukar dari EN ke BM, semua label dikemaskini | Bahasa asal: EN, Bahasa baru: BM |


---


#### Kes Ujian 10: Muat Turun Ringkasan PDF

**Jadual 4.21 Pengujian Kes Pengguna (Muat Turun Ringkasan PDF)**

| Medan | Keterangan |
|---|---|
| Kes Penggunaan | Muat Turun Ringkasan PDF |
| Matlamat | Memastikan aplikasi membenarkan pengguna untuk memuat turun ringkasan dalam format PDF untuk rujukan luar talian (offline). |
| Penerangan Ringkas | Selepas ringkasan dijana, pengguna boleh menekan butang "Muat Turun PDF" untuk menjana fail PDF yang mengandungi ringkasan berstruktur. Fail PDF dijana di pihak klien menggunakan perpustakaan jsPDF. |
| Pelakon | Pelajar (Pengguna Berdaftar) |
| Pra-syarat | 1. Pengguna telah log masuk. 2. Ringkasan telah dijana. |
| Aliran Utama | 1. Pengguna membuka halaman Ringkasan. 2. Pengguna menekan butang "Muat Turun PDF". 3. Aplikasi menjana fail PDF menggunakan jsPDF. 4. Fail PDF dimuat turun secara automatik. |
| Keadaan Selepas | Fail PDF berjaya dimuat turun ke peranti pengguna. |
| Aliran Alternatif | 3a. Ringkasan kosong atau tidak sah. Butang "Muat Turun PDF" dinyahdayakan (disabled). |


**Jadual 4.22 Keadaan Ujian dan Liputan Ujian Kes Penggunaan (Muat Turun Ringkasan PDF)**

| ID Syarat Ujian | Syarat Ujian | ID Liputan Ujian | Liputan Ujian | Data Ujian |
|---|---|---|---|---|
| TCON-10-001 | Aliran Utama | TCOV-10-001 | Fail PDF berjaya dimuat turun | Ringkasan: (teks sah dan lengkap) |
| TCON-10-002 | Aliran Alternatif 3a: Ringkasan kosong | TCOV-10-002 | Butang dimuat turun dinyahdayakan | Ringkasan: (kosong) |


---


#### Kes Ujian 11: Menjawab Kuiz Interaktif

**Jadual 4.23 Pengujian Kes Pengguna (Menjawab Kuiz Interaktif)**

| Medan | Keterangan |
|---|---|
| Kes Penggunaan | Menjawab Kuiz Interaktif |
| Matlamat | Memastikan aplikasi membenarkan pengguna untuk menjawab soalan kuiz secara interaktif, menerima maklum balas segera (betul/salah), dan melihat penjelasan untuk setiap soalan. |
| Penerangan Ringkas | Pengguna membuka halaman Kuiz untuk menjawab soalan MCQ yang telah dijana. Setiap soalan memaparkan pilihan jawapan. Selepas pengguna memilih jawapan, sistem memberikan maklum balas segera (betul/salah dengan warna hijau/merah) dan memaparkan penjelasan. Selepas semua soalan dijawab, skor keseluruhan dipaparkan. |
| Pelakon | Pelajar (Pengguna Berdaftar) |
| Pra-syarat | 1. Pengguna telah log masuk. 2. Kuiz telah dijana. |
| Aliran Utama | 1. Pengguna membuka halaman Kuiz. 2. Soalan dan pilihan jawapan dipaparkan. 3. Pengguna memilih jawapan. 4. Sistem memaparkan maklum balas (betul/salah) dan penjelasan. 5. Pengguna meneruskan ke soalan seterusnya. 6. Selepas semua soalan dijawab, skor keseluruhan dipaparkan. |
| Keadaan Selepas | Pengguna melihat skor keseluruhan dan penjelasan untuk semua soalan. |
| Aliran Alternatif | 2a. Kuiz masih dalam proses pengayaan (enriching). Aplikasi memaparkan penunjuk pemuatan sehingga penjelasan siap. |


**Jadual 4.24 Keadaan Ujian dan Liputan Ujian Kes Penggunaan (Menjawab Kuiz Interaktif)**

| ID Syarat Ujian | Syarat Ujian | ID Liputan Ujian | Liputan Ujian | Data Ujian |
|---|---|---|---|---|
| TCON-11-001 | Aliran Utama (Jawapan betul) | TCOV-11-001 | Maklum balas "Betul!" dengan warna hijau, penjelasan dipaparkan | Soalan: MCQ, Jawapan: (betul) |
| TCON-11-002 | Aliran Utama (Jawapan salah) | TCOV-11-002 | Maklum balas "Salah" dengan warna merah, jawapan betul dan penjelasan dipaparkan | Soalan: MCQ, Jawapan: (salah) |
| TCON-11-003 | Aliran Utama (Skor akhir) | TCOV-11-003 | Skor keseluruhan dipaparkan dengan tepat (contoh: 3/5) | Kuiz: 5 soalan, Jawapan betul: 3 |
| TCON-11-004 | Aliran Alternatif 2a: Kuiz enriching | TCOV-11-004 | Penunjuk pemuatan dipaparkan, bertukar kepada penjelasan apabila siap | Status kuiz: "enriching" |


---


#### Kes Ujian 12: Log Keluar

**Jadual 4.25 Pengujian Kes Pengguna (Log Keluar)**

| Medan | Keterangan |
|---|---|
| Kes Penggunaan | Log Keluar |
| Matlamat | Memastikan aplikasi membenarkan pengguna untuk log keluar dengan selamat dan sesi pengguna ditamatkan sepenuhnya. |
| Penerangan Ringkas | Pengguna boleh log keluar daripada aplikasi melalui butang log keluar di sidebar atau profil. Selepas log keluar, sesi Firebase Auth ditamatkan dan pengguna dialihkan ke halaman utama (Landing page). Pengguna tidak boleh mengakses halaman dalaman tanpa log masuk semula. |
| Pelakon | Pelajar (Pengguna Berdaftar) |
| Pra-syarat | 1. Pengguna telah log masuk. |
| Aliran Utama | 1. Pengguna menekan butang "Log Keluar". 2. Sesi Firebase Auth ditamatkan. 3. Pengguna dialihkan ke halaman utama (Landing page). |
| Keadaan Selepas | Pengguna berjaya log keluar. Semua halaman dalaman tidak boleh diakses tanpa log masuk semula. |
| Aliran Alternatif | (Tiada aliran alternatif — fungsi ini sentiasa berjaya) |


**Jadual 4.26 Keadaan Ujian dan Liputan Ujian Kes Penggunaan (Log Keluar)**

| ID Syarat Ujian | Syarat Ujian | ID Liputan Ujian | Liputan Ujian | Data Ujian |
|---|---|---|---|---|
| TCON-12-001 | Aliran Utama | TCOV-12-001 | Pengguna berjaya log keluar dan dialihkan ke Landing page | Pengguna: (log masuk) |
| TCON-12-002 | Akses selepas log keluar | TCOV-12-002 | Pengguna tidak boleh akses /app, dialihkan ke Landing page | Pengguna: (telah log keluar), URL: /app |


---


### 4.5.2 Pengujian Kebolehgunaan (Tidak Berfungsi)

Pengujian kebolehgunaan (tidak berfungsi) dalam projek ini telah dilaksanakan melalui borang Google Form. Melalui kaedah ini, maklum balas pengguna dikumpul untuk menilai keupayaan aplikasi dalam menangani situasi ralat, kegagalan fungsi, serta cadangan penambahbaikan daripada perspektif pengguna sebenar. Data yang diperoleh digunakan untuk menilai tahap kebolehgunaan dan ketahanan aplikasi terhadap isu-isu yang tidak berfungsi dengan baik.

Antara aspek yang dinilai termasuk:

1. **Kemudahan penggunaan** — Adakah pengguna dapat memuat naik audio dan mendapatkan transkripsi tanpa kesulitan?
2. **Kelajuan respons** — Adakah masa pemprosesan transkripsi, ringkasan, dan kuiz berada dalam had yang boleh diterima?
3. **Kualiti output AI** — Adakah ringkasan dan soalan kuiz yang dijana berkualiti dan membantu pemahaman?
4. **Pemulihan ralat** — Adakah aplikasi berjaya pulih selepas gangguan rangkaian atau kegagalan perkhidmatan AI?
5. **Sokongan berbilang bahasa** — Adakah ciri i18n (Bahasa Melayu / Bahasa Inggeris) berfungsi dengan betul?
6. **Reka bentuk visual** — Adakah antara muka pengguna menarik, jelas, dan mudah difahami?
