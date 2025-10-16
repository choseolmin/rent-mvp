// frontend/src/wagmi.ts
import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient } from "@tanstack/react-query";
import { RPC_SEPOLIA } from "./addresses";

export const queryClient = new QueryClient();

export const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(RPC_SEPOLIA),
  },
  connectors: [
    injected({ shimDisconnect: true }), // ← 브라우저 지갑용
  ],
});
