/**
 * errorUtils.ts
 *
 * Maps raw TF.js / browser / UpscalerJS error messages to human-readable
 * strings that any user can understand — no stack traces, no tensor jargon.
 *
 * Usage:
 *   catch (e) { throw new Error(normalizeError(e)) }
 *   or
 *   updateItem(id, { error: normalizeError(e) })
 */

interface ErrorPattern {
  /** Substring(s) or RegExp to match against the raw error message */
  match: (string | RegExp)[]
  /** Human-friendly message to show instead */
  message: string
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // ── GPU / WebGL ──────────────────────────────────────────────────────────
  {
    match: ['Failed to link vertex and fragment shaders', 'LINK_STATUS'],
    message:
      "Your GPU doesn't support the required graphics features. " +
      "Try switching to Photo mode, or refresh the page to retry in CPU mode.",
  },
  {
    match: ['WebGL context lost', 'CONTEXT_LOST_WEBGL'],
    message:
      "The GPU connection was interrupted (WebGL context lost). " +
      "This usually happens when the browser tab is put in the background for too long. " +
      "Please refresh the page and try again.",
  },
  {
    match: ['Unable to create texture', 'INVALID_OPERATION', 'TEXTURE_2D'],
    message:
      "Image is too large to load onto the GPU. " +
      "Try using a smaller image or switching to 2× scale.",
  },

  // ── Memory / Tensor limits ───────────────────────────────────────────────
  {
    match: [
      'OOM',
      'Out of memory',
      'Allocation of',
      'out of memory',
      'allocate',
    ],
    message:
      "Not enough GPU/system memory to process this image. " +
      "Close other browser tabs, reduce the scale (2× instead of 4×), " +
      "or try a smaller image.",
  },
  {
    match: ['Set maximum size exceeded', 'SET MAXIMUM SIZE EXCEEDED'],
    message:
      "Too many images were processed in sequence and memory wasn't fully cleared. " +
      "Please refresh the page and try again with fewer images in the queue.",
  },
  {
    match: ['Tensor is disposed', 'tensor disposed'],
    message:
      "A processing error occurred (internal tensor was disposed unexpectedly). " +
      "Please refresh the page and try again.",
  },

  // ── Model / dtype errors ─────────────────────────────────────────────────
  {
    match: ['FLOAT32', 'DTYPE', 'dtype'],
    message:
      "The AI model received the wrong data format. " +
      "This is a bug — please report it. As a workaround, try Photo mode instead of Anime mode.",
  },
  {
    match: ['Model not found', 'model.json', '404'],
    message:
      "Could not load the AI model file. " +
      "Check your internet connection and refresh the page.",
  },
  {
    match: ['Failed to fetch', 'NetworkError', 'net::ERR'],
    message:
      "Network error while loading the AI model. " +
      "Make sure you're connected to the internet and refresh the page.",
  },
  {
    match: ['Failed to initialize WebGPU', 'requestAdapter'],
    message:
      "WebGPU is not supported in your current browser. " +
      "The app will automatically fall back to WebGL or CPU mode.",
  },

  // ── Image / file decoding ─────────────────────────────────────────────────
  {
    match: ['HEIC', 'heic', 'HEIF'],
    message:
      "Could not decode the HEIC/HEIF image. " +
      "Try converting it to JPG or PNG first using your phone's camera export settings.",
  },
  {
    match: ['toBlob returned null', 'toBlob'],
    message:
      "Could not encode the output image. " +
      "This can happen with very large output files. Try 2× scale or PNG format.",
  },
  {
    match: ['decode', 'HTMLImageElement', 'Image load'],
    message:
      "Could not read the image file. " +
      "The file may be corrupted or in an unsupported format.",
  },

  // ── Timeout / abort ───────────────────────────────────────────────────────
  {
    match: ['aborted', 'AbortError', 'signal'],
    message: "Processing was cancelled.",
  },
  {
    match: ['timeout', 'Timeout'],
    message:
      "Processing took too long and timed out. " +
      "Try a smaller image, or use 2× scale instead of 4×.",
  },

  // ── WASM / CPU fallback ───────────────────────────────────────────────────
  {
    match: ['wasm', 'WASM', 'instantiate'],
    message:
      "Could not initialize the CPU processing engine. " +
      "Try refreshing the page.",
  },
]

/**
 * Converts any raw error into a user-friendly string.
 * Falls back to a generic message if no pattern matches.
 */
export function normalizeError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error)

  const rawUpper = raw.toUpperCase()

  for (const pattern of ERROR_PATTERNS) {
    for (const matcher of pattern.match) {
      if (matcher instanceof RegExp) {
        if (matcher.test(raw) || matcher.test(rawUpper)) return pattern.message
      } else {
        if (raw.includes(matcher) || rawUpper.includes(matcher.toUpperCase())) {
          return pattern.message
        }
      }
    }
  }

  // Nothing matched — return a sanitized generic message
  // (still show something so we can debug, but make it readable)
  const cleaned = raw.length > 120 ? raw.slice(0, 120) + '…' : raw
  return `An unexpected error occurred: ${cleaned}. Please try again or refresh the page.`
}
