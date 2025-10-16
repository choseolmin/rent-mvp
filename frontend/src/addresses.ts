export const RPC_SEPOLIA = import.meta.env.VITE_RPC_SEPOLIA as string;

export const ADDR = {
  LIVP: import.meta.env.VITE_LIVP as `0x${string}`,
  REGISTRY: import.meta.env.VITE_REGISTRY as `0x${string}`,
  MANAGER: import.meta.env.VITE_MANAGER as `0x${string}`,
} as const;

// 10분(600초) 고정
export const PERIOD_SECONDS = 600n;
