import { expect } from "chai";
import { ethers } from "hardhat";

const PERIOD = 600n;

describe("Lease flow", () => {
  it("register → join(upfront) → time → payRent → close", async () => {
    const [owner, landlord, tenant] = await ethers.getSigners();

    const LIVP = await ethers.getContractFactory("LIVP");
    const livp = await LIVP.connect(owner).deploy();
    await livp.waitForDeployment();

    await livp.transfer(tenant.address, ethers.parseEther("1000"));

    const Registry = await ethers.getContractFactory("RentalRegistry");
    const registry = await Registry.connect(owner).deploy();
    await registry.waitForDeployment();

    const Manager = await ethers.getContractFactory("LeaseManager");
    const manager = await Manager.connect(owner).deploy(await registry.getAddress());
    await manager.waitForDeployment();

    const deposit = ethers.parseEther("100");
    const rent = ethers.parseEther("10");
    const total = 4n;
    const now = (await ethers.provider.getBlock("latest"))!.timestamp;

    const tx = await registry.connect(landlord).createListing(
      await livp.getAddress(), deposit, rent, total, BigInt(now)
    );
    const rc = await tx.wait();
    const created = rc!.logs.find((l: any) => l.fragment?.name === "ListingCreated");
    const listingId = created?.args?.id as bigint;

    await livp.connect(tenant).approve(await manager.getAddress(), ethers.MaxUint256);

    const before = await livp.balanceOf(landlord.address);
    const j = await manager.connect(tenant).joinLease(listingId);
    const jr = await j.wait();
    const started = jr!.logs.find((l: any) => l.fragment?.name === "LeaseStarted");
    const leaseId = started?.args?.leaseId as bigint;

    const after = await livp.balanceOf(landlord.address);
    expect(after - before).to.eq(deposit + rent);

    await ethers.provider.send("evm_increaseTime", [Number(PERIOD)]);
    await ethers.provider.send("evm_mine", []);

    await manager.payRent(leaseId);
    let S = await manager.leases(leaseId);
    expect(S.paidPeriods).to.eq(2n);

    for (let i = 0; i < 2; i++) {
      await ethers.provider.send("evm_increaseTime", [Number(PERIOD)]);
      await ethers.provider.send("evm_mine", []);
      await manager.payRent(leaseId);
    }
    S = await manager.leases(leaseId);
    expect(S.paidPeriods).to.eq(4n);
    expect(S.active).to.eq(false);

    await expect(manager.payRent(leaseId)).to.be.revertedWith("inactive");
  });

  it("fails on insufficient balance despite approve", async () => {
    const [owner, landlord, tenant] = await ethers.getSigners();

    const LIVP = await ethers.getContractFactory("LIVP");
    const livp = await LIVP.connect(owner).deploy();
    await livp.waitForDeployment();

    const Registry = await ethers.getContractFactory("RentalRegistry");
    const registry = await Registry.connect(owner).deploy();
    await registry.waitForDeployment();

    const Manager = await ethers.getContractFactory("LeaseManager");
    const manager = await Manager.connect(owner).deploy(await registry.getAddress());
    await manager.waitForDeployment();

    const deposit = ethers.parseEther("1");
    const rent = ethers.parseEther("1");
    const total = 2n;
    const now = (await ethers.provider.getBlock("latest"))!.timestamp;

    const tx = await registry.connect(landlord).createListing(
      await livp.getAddress(), deposit, rent, total, BigInt(now)
    );
    const rc = await tx.wait();
    const listingId = rc!.logs.find((l: any) => l.fragment?.name === "ListingCreated")!.args.id;

    await livp.connect(tenant).approve(await manager.getAddress(), ethers.MaxUint256);
    await expect(manager.connect(tenant).joinLease(listingId)).to.be.reverted;
  });
});
