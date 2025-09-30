import { ethers } from "hardhat";

// null/undefined 모두 처리하면서 gwei 바닥값 적용
function floor(n: bigint | null | undefined, gwei: number) {
  const f = BigInt(gwei) * 10n ** 9n;
  if (n == null) return f;
  return n < f ? f : n;
}

async function main() {
  const REG = process.env.REGISTRY_ADDRESS;
  if (!REG) {
    throw new Error("REGISTRY_ADDRESS env가 비어 있습니다. 예) export REGISTRY_ADDRESS=0x...");
  }

  const [deployer] = await ethers.getSigners();
  const fee = await deployer.provider!.getFeeData();

  // 네트워크 상황에 따라 바닥값(20/2 gwei) 적용
  const overrides: any = {
    maxFeePerGas: floor(fee.maxFeePerGas, 20),
    maxPriorityFeePerGas: floor(fee.maxPriorityFeePerGas, 2),
  };

  console.log("Deployer:", deployer.address);
  console.log("Using Registry:", REG);
  console.log("Fee overrides:", {
    maxFeePerGas: overrides.maxFeePerGas.toString(),
    maxPriorityFeePerGas: overrides.maxPriorityFeePerGas.toString(),
  });

  const Manager = await ethers.getContractFactory("LeaseManager");
  const manager = await Manager.deploy(REG, overrides);
  console.log("LeaseManager tx:", manager.deploymentTransaction()?.hash);

  await manager.waitForDeployment();
  const addr = await manager.getAddress();
  console.log("LeaseManager:", addr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
