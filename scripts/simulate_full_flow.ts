import "dotenv/config";
import { ethers } from "hardhat";

// gwei → wei
const toWei = (g: number) => BigInt(g) * 10n ** 9n;

// 수수료 상수(네트워크 상황 따라 조절)
const OV = { maxFeePerGas: toWei(60), maxPriorityFeePerGas: toWei(5) };

// 파라미터: 보증금/임대료/회차수
const DEPOSIT = (ethers as any).parseEther("100");
const RENT    = (ethers as any).parseEther("10");
const TOTAL   = 4n;

// 간단 출력
const log = (...args: any[]) => console.log(...args);

async function main() {
  // 0) ENV 로드
  const RPC  = process.env.RPC_SEPOLIA!;
  const LL   = (process.env.LANDLORD || "").toLowerCase(); // landlord 주소
  const TN   = (process.env.TENANT   || "").toLowerCase(); // tenant 주소
  const LL_PK = process.env.LANDLORD_PK!;
  const TN_PK = process.env.TENANT_PK!;
  const LIVP  = process.env.LIVP_ADDRESS!;
  const REG   = process.env.REGISTRY_ADDRESS!;
  const MAN   = process.env.LEASE_MANAGER_ADDRESS!;

  if (!RPC || !LL_PK || !TN_PK || !LIVP || !REG || !MAN) {
    throw new Error("ENV 누락: RPC_SEPOLIA, *_PK, *_ADDRESS 확인");
  }

  const [defaultSigner] = await ethers.getSigners();
  const provider = defaultSigner.provider!;
  const landlord = new (ethers as any).Wallet(LL_PK, provider);
  const tenant   = new (ethers as any).Wallet(TN_PK, provider);

  if (landlord.address.toLowerCase() !== LL) throw new Error("LANDLORD_PK ↔ LANDLORD 주소 불일치");
  if (tenant.address.toLowerCase()   !== TN) throw new Error("TENANT_PK ↔ TENANT 주소 불일치");

  log("Landlord:", landlord.address);
  log("Tenant  :", tenant.address);

  // 1) 컨트랙트 바인딩
  const token = (await ethers.getContractAt("LIVP", LIVP)) as any;
  const reg   = (await ethers.getContractAt("RentalRegistry", REG)) as any;
  const man   = (await ethers.getContractAt("LeaseManager", MAN)) as any;

  // 2) 사전 준비: 세입자 ETH/LIVP 잔액 체크
  const needToken = (DEPOSIT + RENT) as bigint; // 보증금 + 1회차
  const tnEth  = await provider.getBalance(tenant.address);
  const tnTok: bigint = await token.balanceOf(tenant.address);
  log("Tenant balances → ETH:", tnEth.toString(), "LIVP:", tnTok.toString());

  // 세입자 가스 부족 시, 집주인이 0.01 ETH 충전
  if (tnEth < (ethers as any).parseEther("0.003")) {
    const f = await landlord.sendTransaction({ to: tenant.address, value: (ethers as any).parseEther("0.01"), ...OV });
    log("Fund tenant gas tx:", f.hash);
    await f.wait();
  }

  // 세입자 LIVP 부족 시, 집주인 → 세입자 전송
  const llTok: bigint = await token.balanceOf(landlord.address);
  if (tnTok < needToken) {
    if (llTok < needToken) throw new Error("집주인 LIVP 부족. 발행자 잔액 확인 필요");
    const delta = needToken - tnTok;
    const txT = await token.connect(landlord).transfer(tenant.address, delta, OV);
    log("Transfer LIVP to tenant tx:", txT.hash);
    await txT.wait();
  }

  // 3) 세입자 approve(없으면 설정)
  const allowance: bigint = await token.allowance(tenant.address, MAN);
  if (allowance === 0n) {
    const txA = await token.connect(tenant).approve(MAN, (ethers as any).MaxUint256, OV);
    log("Approve tx:", txA.hash);
    await txA.wait();
  } else {
    log("Approve: already set (allowance > 0)");
  }

  // 4) 집주인으로 매물 등록
  const latest = await provider.getBlock("latest");
  const now    = BigInt(latest!.timestamp);
  const txL = await reg.connect(landlord).createListing(LIVP, DEPOSIT, RENT, TOTAL, now, OV);
  log("Registry tx:", txL.hash);
  const rcL = await txL.wait();

  // listingId 파싱
  const parsedL = rcL.logs.map((l: any) => { try { return reg.interface.parseLog(l);} catch { return null; } }).filter(Boolean);
  const listingId: bigint = parsedL.find((p: any) => p.name === "ListingCreated")?.args?.id ?? parsedL[0]?.args?.id;
  log("Listing ID:", listingId?.toString());

  // landlord 확인(반드시 landlord 주소여야 한다)
  const L = await reg.listings(listingId);
  if (L.landlord.toLowerCase() !== landlord.address.toLowerCase()) {
    throw new Error(`Listing landlord mismatch: ${L.landlord} (expected ${landlord.address})`);
  }

  // 5) 세입자로 조인(joinLease) → 보증금+1회차 즉시 집주인으로
  const before: bigint = await token.balanceOf(landlord.address);
  const txJ = await man.connect(tenant).joinLease(listingId, OV);
  log("Join tx:", txJ.hash);
  const rcJ = await txJ.wait();

  const after: bigint = await token.balanceOf(landlord.address);
  const delta = after - before;
  log("Landlord delta (wei):", delta.toString()); // 기대 110e18

  // leaseId 파싱
  const parsedJ = rcJ.logs.map((l: any) => { try { return man.interface.parseLog(l);} catch { return null; } }).filter(Boolean);
  const leaseId: bigint = parsedJ.find((p: any) => p.name === "LeaseStarted")?.args?.leaseId ?? 1n;
  log("Lease ID:", leaseId.toString());

  // 6) 10분 주기 납부(payRent) 시뮬
  // joinLease 직후 nextDue = now + 600 이라 바로는 납부 불가.
  // dueNow(leaseId)가 true가 될 때까지 15초 간격으로 폴링 → 되면 payRent 1회 실행
  async function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

  log("Polling until dueNow == true (최대 12분) ...");
  let ok = false;
  for (let i = 0; i < 48; i++) { // 15초 * 48 = 12분
    const due: boolean = await man.dueNow(leaseId);
    if (due) { ok = true; break; }
    await sleep(15000);
  }
  if (!ok) {
    log("⏱️ 아직 납부 시점이 안 됨(12분 초과). 콘솔에서 수동으로 payRent 호출 가능.");
    log("예) await (await man.payRent(leaseId, OV)).wait()");
    return;
  }

  const before2: bigint = await token.balanceOf(landlord.address);
  const txP = await man.payRent(leaseId, OV);
  log("payRent tx:", txP.hash);
  await txP.wait();
  const after2: bigint = await token.balanceOf(landlord.address);
  log("Landlord delta after payRent (wei):", (after2 - before2).toString()); // 기대 10e18

  // 상태 요약
  const leaseInfo = await man.leases(leaseId);
  log("paidPeriods:", leaseInfo.paidPeriods?.toString?.() ?? leaseInfo.paidPeriods);
  log("nextDue    :", leaseInfo.nextDue?.toString?.() ?? leaseInfo.nextDue);
  log("✅ 시뮬레이션 완료");
}

main().catch((e) => { console.error(e); process.exit(1); });
