/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly RENDERER_VITE_WEBRTC_API_URL: string
  readonly RENDERER_VITE_WEBRTC_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
