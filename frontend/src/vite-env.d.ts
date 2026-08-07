/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Express API, e.g. "https://api.example.com". Empty string = same origin. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
