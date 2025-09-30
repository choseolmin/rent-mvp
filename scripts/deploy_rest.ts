// scripts/deploy_rest.ts
import { ethers } from "hardhat";

function floor(n: bigint | null | undefined, gwei: number) {
  const f = BigInt(gwei) * 10n ** 9n;
  if (n == null) return f;
  return n < f ? f : n;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const provider = deployer.provider!;
  console.log("Deployer:", deployer.address);

  const [bal, fee] = await Promise.all([
    provider.getBalance(deployer.address),
    provider.getFeeData(),
  ]);
  console.log("Balance(ETH):", ethers.formatEther(bal));
  if (bal === 0n) throw new Error("❌ Sepolia 잔액 부족");

  const overrides:any = {
    maxFeePerGas:         floor(fee.maxFeePerGas, 20), // 20 gwei
    maxPriorityFeePerGas: floor(fee.maxPriorityFeePerGas, 2), // 2 gwei
  };
  console.log("Using fees:", {
    maxFeePerGas: overrides.maxFeePerGas.toString(),
    maxPriorityFeePerGas: overrides.maxPriorityFeePerGas.toString(),
  });

  // 이미 배포된 LIVP 주소 사용
  const LIVP_ADDR = process.env.LIVP_ADDRESS || "0xE93f362159a1694a3DE44eb81312451dc67a441D";
  console.log("Using existing LIVP:", LIVP_ADDR);

  const Registry = await ethers.getContractFactory("RentalRegistry");
  const registry = await Registry.deploy(overrides);
  console.log("Registry tx:", registry.deploymentTransaction()?.hash);
  await registry.waitForDeployment();
  const REG_ADDR = await registry.getAddress();
  console.log("Registry:", REG_ADDR);

  const Manager = await ethers.getContractFactory("LeaseManager");
  const manager = await Manager.deploy(REG_ADDR, overrides);
  console.log("LeaseManager tx:", manager.deploymentTransaction()?.hash);
  await manager.waitForDeployment();
  const MAN_ADDR = await manager.getAddress();
  console.log("LeaseManager:", MAN_ADDR);

  console.log("🔑 Addresses\nLIVP:", LIVP_ADDR, "\nRegistry:", REG_ADDR, "\nLeaseManager:", MAN_ADDR);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
