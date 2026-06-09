# ScaleVora

Free, open-source AI image upscaler that runs 100% in your browser. No upload, no signup, works offline.

Built by [VoraLab](https://voralab.id) (PT Modular Media Asia) as a free tool for AI content creators.

## Stack

- React 19 + Vite + TypeScript
- UpscalerJS + ESRGAN-Slim (image upscaling, auto WebGPU → WebGL → WASM fallback)
- WebSR + Mediabunny (video upscaling, Phase 5)
- Zustand, Tailwind CSS, React Router

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
