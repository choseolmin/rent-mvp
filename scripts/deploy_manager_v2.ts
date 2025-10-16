// scripts/deploy_manager_v2.ts
import { ethers } from "hardhat";

async function main() {
  const REG = process.env.REGISTRY_ADDRESS!;
  if (!REG) throw new Error("REGISTRY_ADDRESS not set");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("RegistryV2:", REG);

  const M = await ethers.getContractFactory("LeaseManagerV2");
  console.log("Deploying LeaseManagerV2...");
  const man = await M.deploy(REG);

  // 배포 트랜잭션 해시 표시
  const deployTx = await man.deploymentTransaction();
  console.log("tx hash:", deployTx?.hash);

  // ✅ 1블록 컨펌까지 대기
  if (deployTx) await deployTx.wait(1);

  const manAddr = await man.getAddress();
  console.log("LeaseManagerV2 deployed at:", manAddr);

  // RegistryV2 연결
  const reg = await ethers.getContractAt("RentalRegistryV2", REG);
  const tx = await reg.setManager(manAddr);
  console.log("setManager tx:", tx.hash);
  await tx.wait();
  console.log("✅ Manager set →", await reg.manager());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
