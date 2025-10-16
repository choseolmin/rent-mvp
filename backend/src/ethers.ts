import { ethers } from "ethers";
import { join } from "path";
import * as dotenv from "dotenv";

// ✅ .env는 backend 폴더 바로 아래에 있음
dotenv.config({ path: join(__dirname, "..", ".env") });

// ✅ 최신 V2 ABI (nextLeaseId 포함)
import LeaseManagerAbi from "../abi/LeaseManagerV2.abi.json";
import ERC20Abi from "../abi/ERC20.abi.json";

const rpc = process.env.RPC_SEPOLIA!;
export const provider = new ethers.JsonRpcProvider(rpc);

// ✅ 테넌트(세입자) 계정 — 자동 납부용
export const tenant = new ethers.Wallet(process.env.TENANT_PK!, provider);

// ✅ 가스 기본값 (EIP-1559 형식)
export const toWei = (g: number) => BigInt(g) * 10n ** 9n;
export const ov = { maxFeePerGas: toWei(80), maxPriorityFeePerGas: toWei(6) };

// ✅ 컨트랙트 인스턴스 반환 (V2 주소 및 ABI 사용)
export function getContracts() {
  const man = new ethers.Contract(
    process.env.LEASE_MANAGER_ADDRESS!, // ex) 0x87840eFcCbf454F4d4f378dB93f32D45Fc795EBD
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
