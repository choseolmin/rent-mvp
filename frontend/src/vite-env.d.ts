/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_SEPOLIA: string
  readonly VITE_LIVP: `0x${string}`
  readonly VITE_REGISTRY: `0x${string}`
  readonly VITE_MANAGER: `0x${string}`
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
