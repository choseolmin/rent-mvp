import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 네트워크/잔고 확인용 로그 (선택)
  const net = await ethers.provider.getNetwork();
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Network: ${net.name} (${net.chainId})`);
  console.log(`Balance(ETH): ${ethers.formatEther(bal)}`);

  // 가스 오버라이드 (세폴리아 권장치 예시)
  const toWei = (g: number | bigint) => BigInt(g) * 10n ** 9n;
  const overrides = {
    maxFeePerGas: toWei(60),
    maxPriorityFeePerGas: toWei(5),
  };

  console.log("Deploying RentalRegistryV2...");
  const Factory = await ethers.getContractFactory("RentalRegistryV2");
  const contract = await Factory.deploy(overrides);

  const tx = contract.deploymentTransaction();
  if (!tx) {
    throw new Error("No deployment transaction found");
  }
  console.log("⛽ tx hash:", tx.hash);

  // 블록 1개 컨펌까지 기다림 (waitForDeployment 대신 tx.wait 사용)
  const rc = await tx.wait();
  console.log("📦 mined in block:", rc?.blockNumber);

  const addr = await contract.getAddress();
  console.log("✅ RegistryV2 deployed to:", addr);
}

main().catch((e) => {
  console.error("[deploy_registry_v2] ERROR:", e);
  process.exit(1);
});
