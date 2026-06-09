# ScaleVora Webapp — PRD & Technical Architecture (v2 Final)
**Product:** ScaleVora
**Owner:** PT Modular Media Asia / VoraLab
**Domain:** scalevora.voralab.id
**Last updated:** June 2026
**Status:** Pre-development, ready to build

> **Versi ini adalah single source of truth.** Hasil iterasi dari v1 + recon `free-ai-video-upscaler` ([findings-websr-recon.md](findings-websr-recon.md)) + keputusan arsitektur final.

---

## 1. Overview

ScaleVora adalah webapp AI image upscaler yang berjalan **100% di sisi klien (browser)** — tidak ada server, tidak ada upload, tidak ada biaya hosting per-request. Target utama: AI content creator yang menghasilkan konten dari Kling, Runway, Pika, Midjourney, atau Flux dengan output terbatas di 720p/1024px.

**Posisi strategis:** Free tool permanen sebagai lead magnet ekosistem VoraLab. Bukan produk monetisasi langsung.

**Diferensiasi vs kompetitor terdekat ([free.upscaler.video](https://free.upscaler.video)):**
- Image-first dengan kualitas ESRGAN (mereka video-first dengan Anime4K)
- **Broad-compat termasuk mobile + Firefox + Safari** untuk image mode (mereka Chrome/Edge desktop-only)
- Crop tool + Before/After slider (mereka gak punya)
- Bilingual EN/ID (mereka EN-only)
- Works offline setelah first visit

---

## 2. Goals & Non-Goals

### Goals (MVP — Phase 0–4)
- Upload gambar (JPG/PNG/HEIC), upscale 2× atau 4× via AI di browser
- Auto-convert HEIC ke PNG internal sebelum processing
- Auto-handle EXIF orientation (foto HP tidak terbalik)
- Crop sebelum upscale
- Before/After comparison slider
- Save hasil ke disk (format match input: JPG→JPG, PNG→PNG, HEIC→PNG)
- Works fully offline setelah first model load (via service worker cache)
- Strip semua metadata di output (privacy)
- Zero server cost
- Tanpa login, tanpa signup
- Bilingual EN (default) / ID
- ToS, Privacy Policy, FAQ pages

### Goals (v2 — Phase 5, setelah MVP stabil)
- Upscale video MP4 max 10 detik (720p → 1080p) via WebSR + WebCodecs + Mediabunny
- **Crop video pre-upscale** — user pilih area di first frame, koordinat di-apply ke semua frame
- **Audio toggle** — keep (default) atau remove
- Batch upscale gambar (multi-file) — TBD prioritas

### Non-Goals
- Login / akun user
- Simpan history di cloud
- Upscale video panjang (>10 detik)
- Backend server / GPU cloud
- Monetisasi langsung dari ScaleVora
- Adobe Stock pre-upload pipeline (Adobe Stock melarang up-res)
- PWA installable (deferred — service worker tetap ada untuk cache)
- Native share (breach "no upload" promise)

---

## 3. Target Users

**Primary:** AI content creator Indonesia & global yang:
- Generate konten dari Kling, Runway, Pika, Midjourney, Flux
- Output resolusinya terbatas (720p, 1024px)
- Mau posting ke IG/TikTok/YouTube dengan kualitas lebih tajam
- Tidak mau install software tambahan
- Sering pakai HP (Android & iPhone) — bukan cuma desktop

**Secondary:** Siapapun yang butuh upscale gambar gratis tanpa upload ke server

---

## 4. Technical Architecture

### 4.1 Core Stack

```
Framework        : React 18 + Vite 5
Language         : TypeScript (strict)
Styling          : Tailwind CSS v3 + design tokens (CSS vars)
State            : Zustand
i18n             : Custom lightweight (Zustand-backed locale + JSON dict)
AI Engine (image): UpscalerJS v1 + @upscalerjs/esrgan-slim (browser-optimized)
AI Engine (video): @websr/websr (pinned) + mediabunny + web-demuxer  [Phase 5]
HEIC convert     : heic2any (lazy-loaded saat HEIC detected)
Crop             : react-image-crop
Canvas ops       : Native Canvas API + OffscreenCanvas
Fonts            : Self-hosted via @fontsource (Syne, DM Sans, JetBrains Mono)
Analytics        : Plausible (cookieless, GDPR-friendly)
Error tracking   : Sentry (anonymous, no image data)
Service Worker   : Workbox (model + asset caching, offline support)
Deploy           : Vercel
```

### 4.2 Kenapa stack ini

**UpscalerJS untuk image (Phase 1–4):**
- MIT license, TypeScript support
- Patch-based processing bawaan (mencegah OOM untuk gambar besar)
- Support browser + Node, dengan graceful fallback **WebGPU → WebGL → WASM**
- Model `@upscalerjs/esrgan-slim` (MIT) didesain khusus untuk browser
- **Auto-fallback bikin image mode jalan di Firefox, Safari, mobile** — beda dari WebSR yang WebGPU-only

**WebSR untuk video (Phase 5):**
- Validated production di [free.upscaler.video](https://free.upscaler.video) (250k MAU, 10k video/hari, zero server)
- WebGPU compute shaders = ~8-9ms/frame 720p
- Real-time capable untuk video pendek
- Lihat [findings-websr-recon.md](findings-websr-recon.md) untuk detail keputusan

### 4.3 Licensing (verified Juni 2026)
- UpscalerJS core: **MIT**
- `@upscalerjs/esrgan-slim`: **MIT**
- `@upscalerjs/esrgan-medium`: **MIT**
- WebSR (`@websr/websr`): **MIT**
- Mediabunny: MIT
- Semua aman untuk free-forever positioning, tanpa risiko license flip (MIT irrevocable).

### 4.4 AI Model Loading Strategy

**Lazy-on-intent**, bukan lazy-on-mount:
```
User buka app → page render instant, tidak ada model download
    ↓
User upload file pertama
    ↓
Model di-load via dynamic import (lazy)
    ↓ Progress bar "Loading AI engine... 45%"
    ↓
Cache di IndexedDB via service worker (Workbox)
    ↓
Visit kedua: model di-serve dari cache, instant
    ↓
Setelah load: tombol upscale aktif, badge "⚡ WebGPU" / "● WebGL" / "○ WASM"
```

Model size: ~4–8MB (esrgan-slim) + TF.js runtime ~3MB gzipped. **Download sekali**, cached untuk semua visit berikutnya.

### 4.5 Processing Pipeline (Image)

```
Input: JPG/PNG/HEIC
    ↓
[Auto] HEIC detected → heic2any convert ke PNG Blob (lazy load lib)
    ↓
[Auto] EXIF orientation normalize via createImageBitmap({ imageOrientation: 'from-image' })
    ↓
[Optional] Crop via react-image-crop → Canvas → Blob
    ↓
UpscalerJS.upscale(imageElement, { patchSize, padding: 2, progress, signal })
    patchSize: 128 (<512px) | 64 (512-1024px) | 48 (>1024px)
    ↓
Output: HTMLCanvasElement / ImageData (semua metadata stripped)
    ↓
Format-match output:
    JPG input  → canvas.toBlob('image/jpeg', 0.95)
    PNG input  → canvas.toBlob('image/png')  [preserve transparency]
    HEIC input → canvas.toBlob('image/png')  [HEIC → PNG]
    ↓
Browser save dialog (no server roundtrip)
```

### 4.6 Browser Compatibility & Strategy

**Image mode (Phase 1-4) — broad-compat via auto-fallback:**

| Browser | Backend yang Aktif | Status |
|---|---|---|
| Chrome/Edge 113+ desktop | WebGPU | ⚡ Accelerated |
| Safari 26+ desktop | WebGPU | ⚡ Accelerated |
| Firefox 141+ Windows | WebGPU | ⚡ Accelerated |
| Chrome Android 12+ | WebGPU/WebGL | ⚡ atau ● Standard |
| Safari iOS 17+ | WebGL2 | ● Standard |
| Firefox desktop (non-WebGPU) | WebGL2 | ● Standard |
| Browser sangat lama | WASM | ○ Basic (sangat lambat) |

UpscalerJS otomatis fallback. UI tampilkan badge tanpa user perlu paham detail.

**Video mode (Phase 5) — WebGPU-only:**
Sama strategy seperti free.upscaler.video — kalau gak ada WebGPU, hard-stop dengan compat panel arahkan ke Chrome/Edge desktop.

**Tidak pakai COOP/COEP headers.** Confirmed dari recon — WebSR & UpscalerJS WebGPU/WebGL path gak butuh SharedArrayBuffer. Drop ini menghemat kelas gotcha gede (Google Fonts, og:image, embed cross-origin tetap jalan).

### 4.7 Mobile Constraints

```
Dimensi input max di mobile: 1536px sisi terpanjang
    → Auto-downscale dulu kalau lebih besar (warning ke user)
Scale 4× di mobile: DISABLED
    → Tooltip: "4× requires desktop"
Pre-process warning untuk gambar besar di mobile:
    "Large image may cause tab to reload. Continue?"
Deteksi mobile: UA primary + viewport secondary
    isMobile = /iPhone|Android/i.test(UA) || innerWidth < 768
    (jangan andalkan navigator.deviceMemory — Safari iOS return undefined)
```

### 4.8 File Structure

```
scalevora/
├── public/
│   ├── wasm/                              ← self-hosted WASM (web-demuxer Phase 5)
│   ├── og-image.png
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── UploadZone/
│   │   ├── ImageProcessor/                ← orchestrator
│   │   ├── CropTool/
│   │   ├── BeforeAfterSlider/
│   │   ├── ModelLoader/                   ← progress + WebGPU/WebGL badge
│   │   ├── ScaleSelector/                 ← 2× / 4× toggle
│   │   ├── SaveButton/                    ← (bukan "Download")
│   │   ├── CompatDetector/                ← WebGPU/WebGL/memory check
│   │   ├── LocaleToggle/                  ← EN/ID switch
│   │   └── ErrorBoundary/
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── ToS.tsx
│   │   ├── Privacy.tsx
│   │   └── FAQ.tsx
│   ├── hooks/
│   │   ├── useUpscaler.ts
│   │   ├── useImageFile.ts                ← handle file + HEIC + EXIF
│   │   ├── useProcessingWorker.ts
│   │   └── useLocale.ts
│   ├── workers/
│   │   └── upscale.worker.ts              ← OffscreenCanvas worker
│   ├── store/
│   │   └── appStore.ts
│   ├── locales/
│   │   ├── en.ts                          ← default
│   │   └── id.ts
│   ├── utils/
│   │   ├── imageUtils.ts
│   │   ├── exifUtils.ts                   ← orientation normalize
│   │   ├── heicUtils.ts                   ← lazy HEIC convert
│   │   ├── canvasUtils.ts
│   │   ├── fileUtils.ts
│   │   └── compatUtils.ts                 ← browser capability detection
│   ├── lib/
│   │   ├── sentry.ts                      ← init + scrub policy
│   │   ├── plausible.ts                   ← custom event helpers
│   │   └── sw-register.ts                 ← service worker registration
│   ├── types/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── service-worker.ts                       ← Workbox-based
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
└── package.json
```

### 4.9 Zustand Store Shape

```typescript
interface AppStore {
  // Model state
  modelStatus: 'idle' | 'loading' | 'ready' | 'error'
  modelProgress: number
  backend: 'webgpu' | 'webgl' | 'wasm' | null

  // Compat
  compatLevel: 'full' | 'limited' | 'unsupported'

  // File state
  originalFile: File | null
  originalFormat: 'jpg' | 'png' | 'heic' | null    // determines output format
  originalDataUrl: string | null
  originalDimensions: { width: number; height: number } | null
  croppedBlob: Blob | null

  // Processing state
  processingStatus: 'idle' | 'processing' | 'cancelling' | 'done' | 'error'
  processingProgress: number
  resultBlob: Blob | null
  resultDimensions: { width: number; height: number } | null
  abortController: AbortController | null

  // Settings
  scaleFactor: 2 | 4
  locale: 'en' | 'id'

  // Actions
  setFile: (file: File) => Promise<void>     // handles HEIC + EXIF internally
  setCropped: (blob: Blob) => void
  setScale: (scale: 2 | 4) => void
  setLocale: (locale: 'en' | 'id') => void
  startProcessing: () => Promise<void>
  cancelProcessing: () => void
  reset: () => void
}
```

---

## 5. UI/UX Specification

### 5.1 Pages

```
/              → Landing + Upscaler tool (single page interaction)
/tos           → Terms of Service (lean, 1 page)
/privacy       → Privacy Policy (lean, 1 page)
/faq           → FAQ (lean, 1 page)
```

Landing tetap lean — ToS/Privacy/FAQ linked dari footer.

### 5.2 Main Layout

```
┌─────────────────────────────────────────────────┐
│  ⬡ SCALEVORA  by VoraLab    [⚡ WebGPU] [EN|ID] │
├─────────────────────────────────────────────────┤
│                                                 │
│   [STATE: EMPTY]                                │
│   ┌─────────────────────────────────────────┐   │
│   │  Drag & drop or click to upload         │   │
│   │  JPG, PNG, HEIC — max 10MB              │   │
│   └─────────────────────────────────────────┘   │
│   ✓ No upload  ✓ No signup  ✓ Works offline    │
│                                                 │
│   [STATE: UPLOADED — CROP OPTIONAL]             │
│   Original preview + crop overlay               │
│   [Skip crop] [Apply crop & Upscale →]          │
│                                                 │
│   [STATE: PROCESSING]                           │
│   Progress + ETA + [Cancel]                     │
│                                                 │
│   [STATE: DONE]                                 │
│   Before ←──── slider ────→ After               │
│   Stats: 1024×576 → 2048×1152 | 2× | 8.3s      │
│   [💾 Save 2× PNG (~3.2MB)] [Process New]      │
│                                                 │
├─────────────────────────────────────────────────┤
│  ToS · Privacy · FAQ · GitHub · by VoraLab     │
└─────────────────────────────────────────────────┘
```

### 5.3 Design Tokens

```css
/* Dark theme, amber accent — starting point untuk VoraLab brand */
--bg-primary: #0A0A0A
--bg-surface: #141414
--bg-elevated: #1E1E1E
--accent: #F0B429
--accent-dim: #8B6914
--text-primary: #F5F5F5
--text-secondary: #888888
--border: #2A2A2A
--success: #4ADE80
--error: #F87171

/* Typography (self-hosted via @fontsource) */
--font-display: 'Syne', sans-serif
--font-body: 'DM Sans', sans-serif
--font-mono: 'JetBrains Mono', mono
```

Catatan: VoraLab belum punya brand guide formal — tokens ini jadi acuan starting point.

### 5.4 Copy: "Save" bukan "Download"

Throughout UI, gunakan **"Save"** atau **"Export"**, bukan "Download". Konsistensi dengan messaging "no upload, no server":

- ✅ "Save 2× PNG (~3.2MB)"
- ✅ "Export result"
- ❌ "Download" (mengimplikasikan ada server)

Filename: `scalevora_{originalName}_{scale}x.{ext}`

### 5.5 Compat Detector (Landing)

Sebelum upload zone, jalankan check ringan & tampilkan badge:

```
✅ Full support  → WebGPU detected, all features available
⚠ Standard mode → WebGL fallback, slower but works
🚫 Not supported → very old browser, recommend Chrome/Edge update
```

Cek:
- `navigator.gpu` (WebGPU)
- WebGL2 context creation
- `OffscreenCanvas` support
- `createImageBitmap` support

### 5.6 Bilingual EN/ID

- Default: **EN**
- Toggle di header (EN | ID)
- Persist preference di `localStorage`
- Auto-detect dari `navigator.language` saat first visit — kalau `id-*`, default ke ID; selain itu EN

### 5.7 Error States

| Kondisi | Handling |
|---|---|
| File >10MB | Inline error di upload zone (icon ⚠) |
| Format tidak didukung | Inline error: "JPG, PNG, or HEIC only" |
| HEIC convert gagal | Toast + fallback: "Could not read HEIC — try converting to JPG first" |
| Processing error | Toast + "Try again" |
| Model load gagal | Banner: "AI engine unavailable. Refresh or try Chrome/Edge" |
| Mobile large image | Pre-process modal: "Large image may cause tab reload. Continue?" |
| WebGPU not supported (Phase 5 video) | Compat panel with browser recommendations |

---

## 6. Edge Cases & Constraints

| Kondisi | Handling |
|---|---|
| File >10MB | Reject sebelum processing |
| Dimensi >2048px sisi terpanjang (desktop) | Warning: "Large image — may take 60s+" |
| Dimensi >1536px sisi terpanjang (mobile) | Auto-downscale dulu + warning |
| WebGPU tidak available (image) | Auto-fallback WebGL → WASM (transparent) |
| WebGPU tidak available (video Phase 5) | Hard-stop, compat panel |
| User tutup tab saat processing | State hilang, no recovery |
| Format selain JPG/PNG/HEIC | Reject di upload validation |
| HEIC dari iPhone | Auto-convert lewat heic2any (lazy load) |
| Foto dengan EXIF rotation | Auto-normalize via createImageBitmap |
| Cancel mid-tile | UpscalerJS abort = between-tile only. Label "Cancelling..." sampai tile selesai |
| Service worker update tersedia | Toast "New version available. Reload?" |

---

## 7. Phase Breakdown

---

### PHASE 0 — Project Setup
**Estimasi:** 1–2 jam
**Goal:** Project jalan, dependencies installed, deploy ke Vercel.

#### Tasks

**T0.1 — Init project**
```bash
npm create vite@latest scalevora -- --template react-ts
cd scalevora
```

**T0.2 — Install dependencies**
```bash
# Core
npm install upscaler @upscalerjs/esrgan-slim
npm install zustand
npm install react-image-crop
npm install heic2any

# Styling + fonts (self-hosted)
npm install -D tailwindcss postcss autoprefixer
npm install @fontsource/syne @fontsource/dm-sans @fontsource/jetbrains-mono
npx tailwindcss init -p

# Routing + i18n (lightweight)
npm install react-router-dom

# Service worker
npm install -D workbox-build workbox-window

# Observability
npm install @sentry/react
# Plausible: script tag, no npm
```

**T0.3 — Konfigurasi Tailwind + design tokens**
- `tailwind.config.ts` dengan content paths
- Import design tokens (section 5.3) sebagai CSS vars di `:root`
- Map ke Tailwind theme extend

**T0.4 — Konfigurasi Vite**
```typescript
// vite.config.ts
optimizeDeps: {
  exclude: ['upscaler', '@tensorflow/tfjs']
},
worker: { format: 'es' },
// NOTE: TIDAK pakai COOP/COEP headers — confirmed gak perlu via recon WebSR.
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'upscaler': ['upscaler', '@upscalerjs/esrgan-slim'],
        'tfjs': ['@tensorflow/tfjs'],
        'react': ['react', 'react-dom', 'react-router-dom'],
        'heic': ['heic2any'],   // lazy chunk
      }
    }
  }
}
```

**T0.5 — Import self-hosted fonts** di `main.tsx`:
```typescript
import '@fontsource/syne/600.css'
import '@fontsource/syne/800.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/jetbrains-mono/400.css'
```

**T0.6 — Buat Zustand store** (`src/store/appStore.ts`) sesuai shape section 4.9.

**T0.7 — Setup tsconfig** — `strict: true`, paths alias `@/*` → `src/*`.

**T0.8 — Buat 3 page stubs** (`/tos`, `/privacy`, `/faq`) + wire React Router.

**T0.9 — Konfigurasi vercel.json**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://plausible.io https://js.sentry-cdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://plausible.io https://*.sentry.io; worker-src 'self' blob:; child-src 'self' blob:; font-src 'self' data:" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

**T0.10 — Deploy ke Vercel**
- GitHub repo: `scalevora` (open-source, MIT — match positioning)
- Connect Vercel, set domain `scalevora.voralab.id`
- Verify build

**Acceptance criteria Phase 0:**
- [ ] `npm run dev` jalan tanpa error
- [ ] Halaman kosong deploy di `scalevora.voralab.id`
- [ ] Tailwind aktif, design tokens accessible
- [ ] Self-hosted fonts loaded (no Google Fonts CDN)
- [ ] TypeScript strict mode aktif
- [ ] CSP header aktif (verify via DevTools Network tab)
- [ ] Routing ke `/tos`, `/privacy`, `/faq` jalan

---

### PHASE 1 — Core AI Upscaling Engine
**Estimasi:** 4–6 jam
**Goal:** Upload → upscale → save flow lengkap dengan format pairing + EXIF + HEIC.

#### Tasks

**T1.1 — `useModelLoader.ts` (lazy-on-intent)**
- TIDAK auto-load saat mount
- Trigger load saat user upload file pertama
- Track progress via `onProgress`
- Detect backend: WebGPU > WebGL > WASM
- Update store: `modelStatus`, `modelProgress`, `backend`

**T1.2 — `ModelLoader.tsx` + badge**
- Progress bar saat loading
- Badge ready state:
  - `⚡ WebGPU` (full accel)
  - `● WebGL` (standard)
  - `○ WASM` (basic, slow warning)

**T1.3 — `useImageFile.ts` hook**
Responsibilities:
1. Detect format: JPG / PNG / HEIC
2. Kalau HEIC → `await import('@/utils/heicUtils')` → convert ke PNG Blob
3. Kalau image elemnt biasa → `createImageBitmap(blob, { imageOrientation: 'from-image' })` untuk EXIF normalize
4. Validate size (max 10MB) + dimensions
5. Mobile: kalau >1536px → modal "Auto-resize? Continue?"
6. Update store dengan `originalFormat` (penting untuk output match)

**T1.4 — `heicUtils.ts` (lazy)**
```typescript
export async function convertHeicToPng(file: File): Promise<Blob> {
  const { default: heic2any } = await import('heic2any')
  return heic2any({ blob: file, toType: 'image/png' }) as Promise<Blob>
}
```
Bundle 'heic' chunk hanya di-fetch saat HEIC kedeteksi.

**T1.5 — `exifUtils.ts`**
```typescript
export async function normalizedImageBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { imageOrientation: 'from-image' })
}
```
Single source of truth. Semua image yang masuk pipeline lewat sini.

**T1.6 — `UploadZone.tsx`**
- Drag & drop + click input
- Accept: `image/jpeg, image/png, image/heic, image/heif`
- States: idle / drag-over / loading (HEIC convert) / error
- Tagline: "Sharpen your AI content. No upload. No signup. Free."
- Trust line: ✓ No upload ✓ No signup ✓ Works offline

**T1.7 — `useUpscaler.ts` (core)**
- Terima ImageBitmap / Blob + scaleFactor
- `patchSize`: auto-pick by dimension (128/64/48)
- `padding: 2`
- `signal` dari AbortController
- Update progress real-time
- Verify abort behavior selama spike — kalau between-tile only, set status `'cancelling'` saat user klik cancel, biar UI jujur

**T1.8 — `ProcessingOverlay.tsx`**
- Progress + ETA (computed dari elapsed + percent, BUKAN pre-estimate)
- "Cancel" button → "Cancelling..." setelah klik

**T1.9 — `ScaleSelector.tsx`**
- 2× / 4× toggle
- 4× disabled di mobile:
  ```typescript
  const isMobile = /iPhone|Android/i.test(navigator.userAgent) || window.innerWidth < 768
  ```
- Tooltip disabled state

**T1.10 — `SaveButton.tsx`** (bukan DownloadButton)
- Format match input:
  ```typescript
  const mimeType = originalFormat === 'png' || originalFormat === 'heic'
    ? 'image/png'
    : 'image/jpeg'
  const quality = mimeType === 'image/jpeg' ? 0.95 : undefined
  canvas.toBlob(blob => saveAs(blob, filename), mimeType, quality)
  ```
- Filename: `scalevora_{originalName}_{scale}x.{ext}`
- Label: "💾 Save 2× PNG (~3.2MB)" — include estimated size

**T1.11 — `imageUtils.ts` helpers**
- `getImageDimensions(blob)`
- `estimateOutputSize(width, height, scale, format)`
- `formatBytes(bytes)`

**T1.12 — Wire di `App.tsx`/`Home.tsx`** — state machine empty → uploaded → processing → done

**Acceptance criteria Phase 1:**
- [ ] Page load instant (no auto model download)
- [ ] Model load triggered di first upload, progress visible
- [ ] HEIC dari iPhone keterima, auto-convert ke PNG
- [ ] Foto HP dengan EXIF orientation: hasil upscale **tidak terbalik**
- [ ] PNG input dengan transparency → output PNG dengan transparency preserved
- [ ] JPG input → output JPG quality 0.95
- [ ] HEIC input → output PNG
- [ ] Mobile: warning sebelum proses gambar besar
- [ ] Mobile: 4× disabled dengan tooltip
- [ ] Cancel button: state ke "Cancelling..." kalau perlu, lalu reset
- [ ] No UI freeze (worker processing)
- [ ] Output filename sesuai pattern
- [ ] Output strip semua EXIF/metadata (verify via exiftool)

---

### PHASE 2 — Crop Tool + Before/After + Service Worker
**Estimasi:** 4–5 jam

#### Tasks

**T2.1 — `CropTool.tsx` + `cropUtils.ts`** — pakai `react-image-crop`. Output Blob via canvas. Skip / Apply buttons.

**T2.2 — `BeforeAfterSlider.tsx`** — pure CSS + JS (overflow + clip), no library. Touch + mouse events. "BEFORE" / "AFTER" labels.

**T2.3 — Service worker dengan Workbox**
```typescript
// service-worker.ts
// Cache strategy:
// - App shell (HTML/JS/CSS): StaleWhileRevalidate
// - Fonts: CacheFirst (1 year)
// - TF.js + UpscalerJS chunks: CacheFirst (90 days)
// - Model weights (IndexedDB sudah ditangani upscaler internal, tapi cache JS chunks)
// - Offline fallback: cached app shell
```
Register di `lib/sw-register.ts`:
- Auto-update check
- Toast "New version available. Reload?" via `workbox-window`

**T2.4 — Offline indicator** di header: `📡 Offline` saat `!navigator.onLine`. App tetap fungsional kalau model sudah cached.

**T2.5 — "Process New Image" button** — reset state.

**T2.6 — Update flow di `Home.tsx`** — Upload → Crop → Upscale → BeforeAfter → Save → Reset

**Acceptance criteria Phase 2:**
- [ ] Crop drag + resize smooth
- [ ] Skip crop → upscale dengan gambar penuh
- [ ] Apply crop → upscale crop area
- [ ] Before/After slider drag (mouse + touch)
- [ ] Service worker registered, lihat di DevTools Application tab
- [ ] **Test offline:** disable network → reload → app tetap jalan, upscale tetap bisa (kalau model sudah cached)
- [ ] SW update toast muncul saat deploy baru

---

### PHASE 3 — UI Polish, i18n, Pages, Observability
**Estimasi:** 4–6 jam

#### Tasks

**T3.1 — Header polished**
- Logo SCALEVORA (Syne 800)
- "by VoraLab" → link ke voralab.id
- Badge backend status (kanan)
- Locale toggle (EN | ID)
- Offline indicator (kondisional)

**T3.2 — Empty state design** — upload zone besar, animated dashed border, supported formats line.

**T3.3 — Processing state** — blur overlay, amber progress glow, step indicator ("Analyzing → Enhancing → Finalizing"), ETA countdown.

**T3.4 — Result state** — slider full-width, stats row, prominent Save button.

**T3.5 — Mobile responsive** — stack vertikal, touch targets ≥44px.

**T3.6 — Micro-interactions** — hover, drag, success flash.

**T3.7 — Error states** lengkap (lihat section 5.7).

**T3.8 — Footer** + links: `ToS · Privacy · FAQ · GitHub · by VoraLab · Free, forever.`

**T3.9 — SEO + meta** (multi-lingual):
```html
<title>ScaleVora — Free AI Image Upscaler | by VoraLab</title>
<meta name="description" content="Upscale AI-generated images 2× or 4× in your browser. No upload, no signup, works offline. Free forever.">
<meta property="og:image" content="/og-image.png">
<link rel="alternate" hreflang="en" href="https://scalevora.voralab.id/">
<link rel="alternate" hreflang="id" href="https://scalevora.voralab.id/?lang=id">
```

**T3.10 — `CompatDetector.tsx`** — landing badge sesuai section 5.5.

**T3.11 — i18n setup**
```typescript
// src/locales/en.ts & id.ts: flat key-value dict
// src/hooks/useLocale.ts: Zustand-backed, ekspos t(key)
// Auto-detect dari navigator.language
// Persist di localStorage
```
Translate semua user-facing copy.

**T3.12 — Pages: ToS, Privacy, FAQ**
- Lean, 1 halaman tiap-tiap
- ToS: "AS IS", user responsible for content, no warranty, UU ITE context
- Privacy: zero data collection on images, anonymous analytics via Plausible, anonymous errors via Sentry
- FAQ: How it works, offline, why free, HEIC support, browser support

**T3.13 — Sentry init**
```typescript
// lib/sentry.ts
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  beforeSend(event) {
    // Strip any potential image data, file names, blob URLs
    return scrubSensitive(event)
  },
  tracesSampleRate: 0.1,
})
```

**T3.14 — Plausible setup**
- Add script tag (or via npm package)
- Track custom events: `upscale_complete`, `save_clicked`, `voralab_link_clicked`, `locale_changed`, `format_input_*`

**Acceptance criteria Phase 3:**
- [ ] Konsisten design tokens
- [ ] Semua copy bisa di-toggle EN/ID
- [ ] ToS/Privacy/FAQ accessible
- [ ] Mobile semua fitur jalan
- [ ] Lighthouse Performance ≥ 85
- [ ] Sentry capture test error
- [ ] Plausible track test event
- [ ] CompatDetector tampilkan badge benar
- [ ] "by VoraLab" link voralab.id

---

### PHASE 4 — Performance, Testing & Production
**Estimasi:** 3–4 jam

**T4.1 — Code splitting verify**
- Initial bundle (gzipped): target <200KB exclude TF.js
- TF.js + UpscalerJS chunk: lazy load
- heic2any chunk: lazy load
- React Router pages: per-route chunk

**T4.2 — Memory management**
- `URL.revokeObjectURL` setelah pakai
- `ImageBitmap.close()` setelah pakai
- Clear canvas refs
- Test: 3× upscale berturut-turut, monitor memory di DevTools

**T4.3 — Web Worker untuk upscale**
- Verify UpscalerJS support OffscreenCanvas di worker
- Kalau YES: pipeline di worker thread
- Kalau NO: fallback main thread + UI tetap responsif via micro-tasking

**T4.4 — ErrorBoundary** wrap app + report ke Sentry.

**T4.5 — Manual testing matrix**
Test di: Chrome desktop, Edge desktop, Safari macOS, Firefox desktop, Chrome Android, Safari iOS

Per browser:
- [ ] JPG 100KB → upscale 2× → save → verify output
- [ ] PNG dengan transparency → upscale → verify alpha preserved
- [ ] HEIC dari iPhone → upscale → verify ke PNG
- [ ] Foto rotated EXIF → upscale → tidak terbalik
- [ ] File 9.5MB → upscale 4× (desktop) atau 2× (mobile) → tidak crash
- [ ] File 11MB → error muncul
- [ ] Drag & drop
- [ ] Cancel mid-processing → state reset
- [ ] Crop 200×200 dari gambar besar → upscale → tajam
- [ ] Slider drag (mouse + touch)
- [ ] Locale toggle persist
- [ ] **Offline test:** load page → disable network → reload → upscale tetap jalan
- [ ] Output filename match pattern
- [ ] Output exif stripped (exiftool verify)

**T4.6 — Final deploy**
- Push main → Vercel auto-deploy
- Smoke test di production URL di 3 browser
- Verify CSP, SW registration, fonts self-hosted, no Google Fonts CDN

**Acceptance criteria Phase 4:**
- [ ] FCP < 2 detik
- [ ] Initial JS bundle (gzipped) < 200KB
- [ ] No memory leak after 3 upscale runs
- [ ] T4.5 matrix pass
- [ ] Production live di scalevora.voralab.id
- [ ] Sentry + Plausible receiving data

---

### PHASE 5 (v2) — Video Upscaling
**Estimasi:** 1–2 minggu (setelah MVP image stabil ≥2 minggu, zero critical bug)

**Reference implementation:** [sb2702/free-ai-video-upscaler](https://github.com/sb2702/free-ai-video-upscaler) MIT. Detail recon di [findings-websr-recon.md](findings-websr-recon.md).

#### Stack (locked)
- `@websr/websr` (pin version, jangan `^` atau `latest`) — MIT, WebGPU compute shaders
- `mediabunny@^1.27` — mux MP4
- `web-demuxer` — demux MP4. **WASM file wajib self-host di `/public/wasm/`**, jangan rely jsDelivr CDN
- WebCodecs API (native)
- Weights: `cnn-2x-m-rl.json` ("Real Life" Medium) default — code-split per weight (~80KB each)

#### Scope
- Input: MP4 (H.264), max 10 detik, max 720p
- Output: MP4 2× upscale (resolution = cropped_area × 2, atau full × 2 kalau no crop)
- Target: <2 menit untuk 10s 720p di WebGPU desktop
- **Crop (optional):** user pilih area di first frame, koordinat fixed untuk semua frame
- **Audio (default keep, optional remove):** passthrough tanpa re-encode kalau keep

#### Tasks

**T5.1 — Spike** install + ukur latency aktual per frame di hardware target. Verify license weights individual masih MIT.

**T5.2 — WebGPU capability hard-check**
```typescript
const gpu = await WebSR.initWebGPU()
if (!gpu) return showUnsupported('WebGPU')
```
Hard-stop dengan compat panel arah Chrome/Edge desktop. Pattern dari free.upscaler.video.

**T5.3 — `VideoUploader.tsx`** — validate durasi (via mediabunny, bukan `<video>` tag), resolusi, codec.

**T5.4 — `VideoCropTool.tsx` (NEW)**
- Extract first frame: decode 1 frame via mediabunny `VideoDecoder`, render ke canvas
- Pass first frame ke `react-image-crop` (reuse component dari Phase 2)
- User drag/resize crop area → simpan `cropRect: { x, y, width, height }` di store
- UI showcase:
  ```
  Original: 1280×720
  Crop:     720×720
  Output 2×: 1440×1440    ← live preview output dimension
  ```
- Tombol: [Skip crop] [Apply crop & Upscale →]
- Skip → `cropRect = null` → process full frame

**T5.5 — Audio toggle UI**
- Checkbox di video options: `☐ Remove audio (smaller file, no sound)`
- Default: unchecked (keep audio)
- Simpan flag `keepAudio` di store

**T5.6 — `VideoProcessor.ts` — Streams API pipeline**
Copy pattern dari `pipeline-processor.ts` repo refrensi, extend dengan crop support:
```
demuxer.read('video')
  → DemuxerTrackingStream (highWaterMark: 20)
  → VideoDecoderStream (highWaterMark: 10)
  → VideoCropStream (highWaterMark: 8)        ← NEW, skip kalau cropRect null
  → VideoUpscaleStream (highWaterMark: 5)
  → VideoEncoderStream (highWaterMark: 10)
  → MuxerWriter
```
~400-500 baris total. Backpressure otomatis.

**T5.7 — `VideoCropStream` (NEW)**
- Terima `cropRect` saat construct
- Per frame: construct new `VideoFrame` dengan `visibleRect: cropRect`
  ```typescript
  const cropped = new VideoFrame(frame, {
    visibleRect: cropRect,
    timestamp: frame.timestamp,
    duration: frame.duration,
  })
  frame.close()
  ```
- Zero-copy crop di GPU memory — gak perlu intermediate canvas
- Kalau `cropRect = null`, langsung passthrough

**T5.8 — Encoder config** (dynamic berdasarkan crop):
```typescript
const outputWidth = (cropRect?.width ?? videoTrack.width) * 2
const outputHeight = (cropRect?.height ?? videoTrack.height) * 2

codec: 'avc1.4d0034'                        // H.264 Main Profile L5.2
bitrate: 2.5e6 * (outputWidth*outputHeight*4) / (1280*720*4)
framerate: parsed_from_demuxer
keyFrame: every 60 frames
```

**T5.9 — Audio handling (conditional)**
```typescript
if (keepAudio && audioConfig) {
  audioSource = new EncodedAudioPacketSource('aac')
  output.addAudioTrack(audioSource)
  // ... demux audio → muxer passthrough
}
// kalau !keepAudio: skip block ini, video-only output
```

**T5.10 — Web Worker mandatory** untuk video pipeline.

**T5.11 — Progress + ETA + Cancel** via AbortController + pause/resume pattern.

**T5.12 — Cross-browser test**
- Chrome/Edge desktop: full support
- Safari 26+: test VideoEncoder H.264 — kemungkinan jalan
- Firefox: VideoEncoder masih partial, likely disable
- Mobile: WebGPU + memory check → disable kalau gak cukup

**T5.13 — Self-host WASM** dari web-demuxer ke `/public/wasm/web-demuxer.wasm`. Update path di config.

#### Hard constraints
- Durasi >10 detik: REJECT (bukan truncate)
- Resolusi >720p: REJECT, suggest compress dulu
- Crop minimum: 240×240 (cegah output absurd kecil)
- Crop koordinat fixed across all frames (bukan tracking)
- Audio: passthrough kalau keep, otherwise omit. **Tidak ada re-encode audio.**
- Processing wajib di Web Worker

#### Open questions sebelum Phase 5 start
- WebSR weights license per-model — re-verify saat Phase 5 dimulai
- Bundle size WebSR + 1 weight: estimate 1-3MB tambahan. Code-split agresif supaya user image-only gak download.

---

## 8. Notes Teknis

### Urutan
Phase 0 → 1 → 2 → 3 → 4 wajib berurutan. Phase 5 hanya setelah MVP ≥2 minggu live, zero critical bug.

### Pre-build verifikasi
1. `npm info upscaler version` — confirm latest stable
2. `npm info @upscalerjs/esrgan-slim` — confirm available
3. Test minimal import + upscale di project kosong sebelum integrasi penuh

### TF.js bundle (~3MB gzipped)
Trade-off accepted. Lazy-on-intent load + service worker cache mitigates first-paint impact. Visit kedua = instant.

### COOP/COEP — TIDAK PERLU
Confirmed via recon free.upscaler.video (mereka pakai Google Fonts cross-origin tanpa masalah). WebGPU/WebGL path UpscalerJS dan WebSR tidak butuh SharedArrayBuffer.

### Mobile 4× disable
Proteksi UX, bukan limitasi teknis. Re-evaluate based on feedback post-launch.

### Fallback kalau UpscalerJS bermasalah
1. `@huggingface/transformers` model `Xenova/swin2SR-classical-sr-x2-64`
2. WebSR (sb2702/websr) — lebih lightweight, WebGPU native (sudah dipakai Phase 5)

### Open source
Repo public dengan license MIT, sejalan dengan free-forever positioning. Risiko fork ada tapi minor — counter dengan: aktif maintain, kualitas implementation, brand VoraLab ecosystem.

### Sensitivitas data
- Sentry config `beforeSend` scrub: filename, blob URLs, image dimensions kalau identifiable. Hanya stack trace + error type yang dikirim.
- Plausible: cookieless, IP hashed, no fingerprint. Aman untuk privacy positioning.

---

## 9. Success Metrics (post-launch, 30 hari)

| Metrik | Target | Sumber |
|---|---|---|
| Unique visitors | 500+ | Plausible |
| Upscale completions | 200+ | Plausible custom event |
| Bounce rate (sebelum upload) | <60% | Plausible |
| "by VoraLab" link clicks | 50+ | Plausible custom event |
| Crash-free sessions | >99.5% | Sentry |
| Returning users (offline cache hit) | >20% (validates SW value) | Plausible |
| Mobile completion rate | >40% (validates broad-compat strategy) | Plausible breakdown |
| Locale split EN:ID | track, no target | Plausible |

---

## 10. Decision Log

| Decision | Why | Date |
|---|---|---|
| Image-first, broad-compat | Differentiator vs free.upscaler.video, target Indonesia mobile-heavy | Juni 2026 |
| Drop COOP/COEP | Tidak dibutuhkan WebGPU/WebGL path, hindari Google Fonts breakage | Juni 2026 |
| Service worker MVP (bukan v2) | Visit-2 instant load = huge UX win, effort kecil | Juni 2026 |
| HEIC auto-convert (bukan reject) | iPhone user-friendly, all metadata stripped anyway | Juni 2026 |
| "Save" bukan "Download" | Konsistensi messaging "no upload no server" | Juni 2026 |
| Bilingual EN(default)/ID | Target global + Indonesia | Juni 2026 |
| Domain scalevora.voralab.id | Brand authority transfer ke VoraLab ecosystem | Juni 2026 |
| Open source MIT | Match free-forever positioning, dev community amplify | Juni 2026 |
| WebSR + Mediabunny untuk Phase 5 | Validated production at 250k MAU | Juni 2026 |
| Video crop (static rect across frames) | Reframing AI video Kling/Runway/Pika ke vertical, differentiator vs free.upscaler.video | Juni 2026 |
| Audio toggle (keep default, remove option) | User control + smaller output kalau gak butuh audio | Juni 2026 |

---

*Dokumen ini adalah single source of truth untuk development ScaleVora webapp v2. Update setiap ada perubahan keputusan arsitektur.*
