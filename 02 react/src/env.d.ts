/// <reference types="vite/client" />

/** .env 변수 타입 정의 — 변수를 추가하면 여기도 추가 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_USE_MOCK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
