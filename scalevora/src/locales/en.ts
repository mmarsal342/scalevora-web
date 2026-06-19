export const en = {
  // Header
  'header.tagline': 'by VoraLab',
  'header.locale': 'EN',
  'header.offline': '● Offline',

  // Home / Upload
  'home.tagline': 'Sharpen your AI content. No upload. No signup. Free.',
  'home.upload.cta': 'Drag & drop or click to upload',
  'home.upload.formats': 'JPG, PNG, HEIC — max 10MB',
  'home.trust.noUpload': 'No upload',
  'home.trust.noSignup': 'No signup',
  'home.trust.offline': 'Works offline',

  // Upload mode toggle
  'upload.single': 'Single',
  'upload.batch': 'Batch',

  // Style selector
  'style.photo': 'Photo',
  'style.anime': 'Anime',

  // Crop
  'crop.label': 'Crop · Pick scale',
  'crop.skip': 'Skip crop',
  'crop.apply': 'Apply crop ↑',
  'crop.busy': 'Cropping…',

  // Preview
  'preview.label': 'Preview · Pick scale',
  'preview.upscale': 'Upscale ↑',
  'preview.reset': 'Reset',
  'preview.crop': 'Crop first',

  // Done
  'done.label': 'Done',
  'done.before': 'Before',
  'done.after': 'After',
  'done.processNew': 'Process new',

  // Batch
  'batch.label': 'Batch Upscale',
  'batch.start': 'Start Batch ↑',
  'batch.cancel': 'Cancel',
  'batch.clear': 'Clear all',
  'batch.autoDownload': 'Auto-download',
  'batch.backToSingle': 'Back to single',
  'batch.files': 'files',
  'batch.done': 'done',
  'batch.errors': 'errors',
  'batch.queued': 'queued',
  'batch.allDone': 'All done',
  'batch.processed': 'processed',
  'batch.upload.cta': 'Drag & drop or click to add images',
  'batch.upload.multi': 'Multiple files',
  'batch.upload.filesLoaded': 'files loaded',

  // Footer
  'footer.tos': 'Terms',
  'footer.privacy': 'Privacy',
  'footer.faq': 'FAQ',
  'footer.github': 'GitHub',
  'footer.tagline': 'ScaleVora by VoraLab · Free, forever.',

  // Pages
  'page.tos.title': 'Terms of Service',
  'page.privacy.title': 'Privacy Policy',
  'page.faq.title': 'Frequently Asked Questions',
  'page.backHome': '← Back to home',
} as const

export type TranslationKey = keyof typeof en
