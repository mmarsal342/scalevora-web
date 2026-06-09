# Recon: free-ai-video-upscaler

**Source:** [sb2702/free-ai-video-upscaler](https://github.com/sb2702/free-ai-video-upscaler) — MIT, 454★, last commit baru
**Live:** https://free.upscaler.video (250k MAU, 10k video/hari, zero server)
**Scope recon:** ambil pelajaran konkret untuk PRD ScaleVora, terutama Phase 5 video.

---

## Apa yang mereka pakai (stack final)

| Layer | Pilihan | Catatan |
|---|---|---|
| Framework | Vanilla TS + Alpine.js + Bootstrap | **Bukan React**. Kita tetap React+Vite — alasan: image mode butuh state lebih kompleks (crop, before/after, scale toggle). |
| Bundler | Webpack 5 + Babel + ts-loader | Kita tetap Vite. Lebih cepat dev. |
| SR engine | `@websr/websr@0.0.14` | Versi pinned, bukan latest. Worth pinning juga di kita. |
| Video pipeline | `mediabunny@1.27` + `web-demuxer@4.0` | Demuxer terpisah (WASM-based), mediabunny untuk mux. |
| File I/O | **File System Access API** (`showOpenFilePicker`, `showSaveFilePicker`) | ⚠️ Chrome/Edge only — Firefox & Safari diblock. Lihat keputusan bawah. |
| Error tracking | **Sentry** (CDN inline di `<head>`) | Confirms #8 dari analisa kita feasible. |
| Fonts | Google Fonts (Manrope) via `fonts.googleapis.com` | Berarti mereka **tidak pakai COEP**. Lihat finding kunci bawah. |
| Service worker / PWA | **Tidak ada** | Weights ~750KB di-download tiap visit. Kita bisa do better (#5 kita). |
| Analytics | (gak ditemukan di source — kemungkinan via Sentry atau third-party CDN script) | — |

---

## Finding kunci yang langsung ubah PRD kita

### 1. ✅ COEP TIDAK perlu — confirmed
Mereka **tidak set** `Cross-Origin-Embedder-Policy`. Buktinya: pakai Google Fonts cross-origin tanpa masalah. Artinya **WebSR + WebGPU gak butuh SharedArrayBuffer**.

**Aksi:** drop COEP/COOP dari T0.4 dan T4.7 di PRD. Hemat satu kelas gotcha gede. Google Fonts (atau self-host) bebas dipilih.

### 2. ✅ WebGPU-only strategy = clean cutoff, bukan graceful fallback
Mereka **gak punya WebGL fallback**. Kalau WebGPU gak ada, langsung tampil panel:

> "Your browser does not support **WebGPU**. Try latest Chrome or Edge on desktop."

**Trade-off untuk kita:**
- Pro: code 2x lebih sederhana, gak perlu maintain 2 backend
- Con: di Juni 2026 WebGPU support udah luas (Chrome/Edge/Safari 26+/Firefox 141+ Win), tapi Firefox macOS/Linux & Safari lama masih off
- Tapi PRD kita pakai **UpscalerJS** untuk image (Phase 1-4), bukan WebSR. UpscalerJS pakai TF.js yang **otomatis fallback WebGL → WASM**. Jadi image mode tetap broad-compat.
- Phase 5 video pakai WebSR = WebGPU-only adalah keputusan yang masuk akal (video processing emang butuh GPU)

**Aksi:** di Phase 5, adopt strategy mereka — kalau gak WebGPU, hard-stop dengan compat panel (sejajar dengan #11 kita). Image tetap broad-compat via UpscalerJS.

### 3. ⚠️ File System Access API = exclude Firefox & Safari
Mereka pakai `showOpenFilePicker` + `showSaveFilePicker` (FS Access API). Bagusnya: progressive write ke disk untuk file gede (gak nahan 2GB di RAM). Jeleknya: Firefox & Safari sepenuhnya gak support → langsung kena "unsupported" panel.

**Implikasi buat kita:**
- Image mode (Phase 1-4): file size 10MB max → **gak butuh** FS Access API. Pakai `<input type="file">` + `Blob` + `<a download>` standard. Cross-browser, including Firefox/Safari.
- Video mode (Phase 5): output bisa 100MB+ → FS Access API recommended **kalau** target Chrome/Edge only. Atau alternatif: in-memory buffer + download blob (mereka punya fallback `InMemoryStorage`, lihat `processors/in-memory-storage.ts`).

**Aksi:** image-only flow Phase 1-4 = **standard file API, broad browser support**. Sejalan dengan #11 (compat detect badge), bukan hard-block.

### 4. 🎯 Streams API + backpressure = pattern wajib copy untuk Phase 5
Mereka pakai `TransformStream` chain:
```
demuxer.read() → DemuxerTrackingStream → VideoDecoderStream → VideoUpscaleStream → VideoEncoderStream → MuxerWriter
```
Backpressure otomatis via `highWaterMark`:
- Demuxer buffer: 20 chunks
- Decoder buffer: 10 frames
- Upscale buffer: **5 frames** (paling kecil — frames upscaled itu gede)
- Encoder buffer: 10

Pipeline total ~400 baris, jauh lebih ringkes dari manual queue management.

**Aksi:** Phase 5 T5.4-5.5 rewrite — gak perlu "manual frame queue (max 10)", pakai Streams API + highWaterMark. Update PRD.

### 5. 📦 Weight files = JSON, total 748KB
Bukan binary weights — mereka serialize ke JSON. 9 file (3 size × 3 content type: small/medium/large × rl/anime/3d). Per-network rata-rata 80KB.

**Implikasi:**
- Code-split per weight file. User pilih "Real Life Medium" = load 1 file 80KB doang, bukan semua 748KB.
- Cache via service worker (#5 kita) → kedua kunjungan gratis.

### 6. 🚨 Encoder config yang udah validated production
```js
codec: 'avc1.4d0034'           // H.264 Main Profile L5.2
bitrate: 2.5e6 * (w*h*4) / (1280*720)  // scale linear by pixel count
keyFrame: index % 60 === 0     // I-frame setiap 60 frame
```
Worth copy untuk Phase 5. Saves us tuning time.

### 7. 🎬 Audio passthrough — confirmed pattern
Mereka **gak re-encode audio**. Demux audio chunk → langsung tulis ke muxer. Sejalan dengan saran gw sebelumnya di PRD.

### 8. ❌ Tidak ada image-only mode terpisah
Site mereka tulis "Upscale videos or images" tapi di source, "image" sebenarnya **first frame video** atau preview frame — bukan upload JPG/PNG terpisah. Mereka pakai WebSR (video-optimized) untuk semua.

**Implikasi:** **kita beda secara strategis** — image mode kita pakai UpscalerJS (ESRGAN) yang lebih kuat per-image. Differentiator vs free.upscaler.video.

### 9. ⚠️ Limit hard: 1.9GB ArrayBuffer
```js
const MAX_FILE_BLOB_SIZE = 1900*1024*1024; // ArrayBuffer max
```
Bukan masalah buat kita (image 10MB, video 10s).

---

## Yang mereka **gak** punya, kita **wajib** ada

| Feature | Kenapa perlu di ScaleVora | Phase |
|---|---|---|
| Service worker cache model weights | Mengingat target user creator yang bolak-balik, hemat 750KB+ per visit ke-2 | MVP (#5) |
| Crop tool | Workflow creator bersih dari frame yang gak perlu | Phase 2 |
| Before/After slider | Differentiator UX | Phase 2 |
| Image-dedicated AI engine (UpscalerJS/ESRGAN) | Kualitas image-only lebih bagus dari WebSR | Phase 1 |
| Mobile-friendly fallback | Bukan WebGPU-only — UpscalerJS auto fallback ke WebGL/WASM | Phase 1 |
| EXIF orientation handling | Foto HP rotated correctly | Phase 1 (#1) |
| HEIC auto-convert | iPhone user friendly | Phase 1 (#3) |
| ToS / Privacy / FAQ pages | Legal cover, brand trust | Phase 3 (#7) |
| Sentry error tracking | "Zero crash" target verify-able | Phase 3 (#8) |
| Bilingual EN/ID | Target Indonesia | Phase 3 |

---

## Yang mereka punya, kita **bisa skip** atau **delay**

| Feature mereka | Keputusan kita |
|---|---|
| Bootstrap + Alpine.js | Skip — pakai React + Zustand + Tailwind |
| File System Access API | Skip Phase 1-4. Re-evaluate untuk Phase 5 video |
| Multiple weight types (anime, 3D) | Phase 5 mulai 1 weight (Real Life Medium). Tambah weight lain post-launch berdasarkan request user. |
| WebGL/WASM fallback untuk video | Skip — Phase 5 WebGPU-only sama seperti mereka |

---

## Action items konkret untuk update PRD

1. **Drop COEP/COOP**: hapus dari T0.4 (vite config) dan T4.7 (vercel.json). Beneran gak perlu untuk WebGPU pure.
2. **Phase 5 T5.4-5.5**: rewrite pakai Streams API + highWaterMark, bukan manual queue.
3. **Phase 5 T5.2 (WebGPU check)**: adopt pattern mereka — `WebSR.initWebGPU()` returns false → tampilkan compat panel, hard-stop.
4. **Phase 5 weights**: code-split per weight JSON (~80KB each), lazy load saat user pilih tier.
5. **Phase 5 encoder config**: copy `avc1.4d0034` + bitrate formula + keyframe interval 60.
6. **Phase 5 dependencies**: `@websr/websr` (pin version), `mediabunny`, `web-demuxer`.
7. **Phase 1 (image mode)**: pertegas pakai standard file input (bukan FS Access API), broad cross-browser.
8. **Service worker (#5)**: confirm pattern bukan dari mereka (mereka gak punya) — kita riset sendiri (Workbox atau plain SW).

---

## Risiko baru yang muncul dari recon

1. **WebSR API surface kecil & versi 0.0.x** — masih pre-1.0. Risiko breaking change ada. Pin version + monitor changelog.
2. **web-demuxer load WASM dari jsDelivr CDN** di repo mereka:
   ```js
   wasmFilePath: "https://cdn.jsdelivr.net/npm/web-demuxer@latest/dist/wasm-files/web-demuxer.wasm"
   ```
   Kita **wajib self-host** ini — jsDelivr down = upscaler kita down. Dan `@latest` di prod itu bahaya.
3. **Mediabunny versi 1.27** — masih relatif baru, watch breaking changes.
4. **Anime4K network name di WebSR**: `"anime4k/cnn-2x-m"` — namanya "anime4k" tapi weights `-rl` (real life) override-nya. Slightly confusing API. Worth document jelas di kode.

---

## Verdict

**Stack mereka validated, banyak yang bisa langsung copy untuk Phase 5.** Tapi posisi produk beda:
- Mereka: video-first, WebGPU-only, Chrome/Edge desktop only
- Kita: **image-first** (Phase 1-4) broad-compat → video (Phase 5) WebGPU-only

Approach ini bikin kita **lebih accessible** di mobile + lebih dari Firefox/Safari user untuk image mode, sambil tetap leverage stack mereka untuk video.

**Gw siap apply semua keputusan ke PRD utama. Tunggu approval lu.**
