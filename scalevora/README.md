# ScaleVora

ScaleVora is a fast, offline-capable, browser-based AI image upscaler. It uses TensorFlow.js to upscale your images directly on your device's GPU, meaning **zero server costs**, **complete privacy** (your images never leave your browser), and **truly offline** functionality once the models are cached.

## Features

- **100% Client-Side Processing**: Images are processed directly in your browser using WebGL or WebGPU.
- **Multiple AI Models**:
  - **📷 Photo (Fast)**: Uses `ESRGAN-Slim` (~879KB). Lightning-fast upscaling for standard photos.
  - **📷 Photo (Quality)**: Uses `ESRGAN-Medium` (~2.7MB). Slower, but produces significantly sharper details for low-resolution photos.
  - **🎨 Anime**: Uses `Real-CUGAN` (~3MB). Specialized model for illustrations, anime, vector graphics, and line art to keep edges crisp.
- **Multi-pass 4× Upscaling**: When selecting 4× scale, the engine runs a 2× model twice recursively (multi-pass) to retain superior context and texture compared to a single-pass 4× model.
- **Batch Processing**: Upscale up to 50 images at once in a queue. Models are dynamically loaded and disposed of between images to prevent GPU memory leaks.
- **Hardware Benchmarking**: Displays the exact elapsed processing time for each image, giving you a real-time benchmark of your GPU's inference speed.
- **Auto-Cropping for Large Images**: Automatically prompts you to crop images that exceed the maximum patch threshold, avoiding GPU Out-Of-Memory crashes.
- **Sharpening Pass**: Applies a lightweight GPU-accelerated CSS unsharp mask before saving to pop the final details.

## Tech Stack

- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS (with custom design system & animations)
- **State Management**: Zustand
- **Machine Learning**: TensorFlow.js (`@tensorflow/tfjs`) + UpscalerJS (`upscaler`)
- **Image Processing**: HTML5 Canvas API
- **Deployment**: Vercel

## Running Locally

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Note on Offline Capabilities

The first time you load the app, your browser will download the UI bundle and the necessary AI model weights (which range from 1MB to 3MB). These are aggressively cached by your browser. Subsequent visits will require **zero bandwidth**. You can disconnect from the internet and the application will continue to function fully.

## License

MIT
