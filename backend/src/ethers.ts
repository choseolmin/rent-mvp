// backend/src/ethers.ts
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

// JSON ABI (tsconfig.json에 "resolveJsonModule": true 필요)
import LeaseManagerAbi from "../abi/LeaseManager.abi.json";
import ERC20Abi from "../abi/ERC20.abi.json";

const rpc = process.env.RPC_SEPOLIA!;
export const provider = new ethers.JsonRpcProvider(rpc);

// 서명자
export const landlord = new ethers.Wallet(process.env.LANDLORD_PK!, provider);
export const tenant   = new ethers.Wallet(process.env.TENANT_PK!,   provider);

// 가스 기본값
export const toWei = (g: number) => BigInt(g) * 10n ** 9n;
export const ov = { maxFeePerGas: toWei(80), maxPriorityFeePerGas: toWei(6) };

// ✅ 동기 반환 + any 캐스팅 (타입 에러 차단)
export function getContracts() {
  const man = new ethers.Contract(
    process.env.LEASE_MANAGER_ADDRESS!,
    LeaseManagerAbi,
    provider
  ) as any;

  const token = new ethers.Contract(
    process.env.LIVP_ADDRESS!,
    ERC20Abi,
    provider
  ) as any;

  return { man, token } as const;
}
