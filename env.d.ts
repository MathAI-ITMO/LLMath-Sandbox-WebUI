/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VIDEO_SERVICE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
