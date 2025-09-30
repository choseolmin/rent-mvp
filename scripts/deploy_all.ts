// scripts/deploy_all.ts
import { ethers } from "hardhat";

// ✅ null/undefined 모두 처리
function floor(n: bigint | null | undefined, gwei: number) {
  const f = BigInt(gwei) * 10n ** 9n;
  if (n == null) return f;            // null 또는 undefined면 바닥값 적용
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

  // ✅ EIP-1559 (maxFee/maxPriority) 바닥값 적용: 20 gwei / 2 gwei
  const overrides: any = {
    maxFeePerGas:          floor(fee.maxFeePerGas, 20),
    maxPriorityFeePerGas:  floor(fee.maxPriorityFeePerGas, 2),
  };
  console.log("Using fees:", {
    maxFeePerGas: overrides.maxFeePerGas.toString(),
    maxPriorityFeePerGas: overrides.maxPriorityFeePerGas.toString(),
  });

  const LIVP = await ethers.getContractFactory("LIVP");
  const livp = await LIVP.deploy(overrides);
  console.log("LIVP tx:", livp.deploymentTransaction()?.hash);
  await livp.waitForDeployment();
  console.log("LIVP:", await livp.getAddress());

  const Registry = await ethers.getContractFactory("RentalRegistry");
  const registry = await Registry.deploy(overrides);
  console.log("Registry tx:", registry.deploymentTransaction()?.hash);
  await registry.waitForDeployment();
  console.log("Registry:", await registry.getAddress());

  const Manager = await ethers.getContractFactory("LeaseManager");
  const manager = await Manager.deploy(await registry.getAddress(), overrides);
  console.log("LeaseManager tx:", manager.deploymentTransaction()?.hash);
  await manager.waitForDeployment();
  console.log("LeaseManager:", await manager.getAddress());

  console.log("✅ Done");
}

main().catch((e)=>{ console.error(e); process.exit(1); });
