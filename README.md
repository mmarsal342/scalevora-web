# ScaleVora

Free, open-source AI image upscaler that runs 100% in your browser. No upload, no signup, works offline.

Built by [VoraLab](https://voralab.id) (PT Modular Media Asia) as a free tool for AI content creators.

## Stack

- React 19 + Vite + TypeScript
- UpscalerJS + TF.js (auto WebGPU → WebGL → WASM fallback)
- AI Models included:
  - `ESRGAN-Slim` (Fast Photo upscaling, ~879KB)
  - `ESRGAN-Medium` (High-Quality Photo upscaling, ~2.7MB)
  - `Real-CUGAN` (Anime/Illustration upscaling, ~3MB)
- WebSR + Mediabunny (video upscaling, Phase 5)
- Zustand, Tailwind CSS, React Router

## Features

- **100% Client-Side**: Truly offline after the first load. Zero server cost.
- **Multi-pass 4× Upscaling**: Runs a 2× model twice recursively for significantly sharper details.
- **Batch Processing**: Queue up to 50 images with automatic memory disposal to prevent OOM.
- **Hardware Benchmarking**: See exact elapsed processing time per image to gauge your GPU speed.
- **Smart Cropping**: Auto-prompts cropping for ultra-large inputs.

## Status

Pre-release, active development. See [`scalevora-prd.md`](./scalevora-prd.md) for the full product spec, and [`findings-websr-recon.md`](./findings-websr-recon.md) for video-stack research notes.

## Local development

```bash
cd scalevora
npm install
npm run dev
```

## License

MIT — see [`LICENSE`](./LICENSE).
