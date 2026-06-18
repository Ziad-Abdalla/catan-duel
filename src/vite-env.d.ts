/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** PartyKit host for online play (e.g. catan-duel.you.partykit.dev). */
  readonly VITE_PARTYKIT_HOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
