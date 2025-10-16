import { WagmiProvider } from "wagmi";
import { config, queryClient } from "./wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { ADDR } from "./addresses";
import { useState } from "react";
import Balances from "./components/Balances";
import LandlordFaucet from "./components/LandlordFaucet";
import PayPanel from "./components/PayPanel";
import { livpAbi } from "./abi/livp";
import { registryV2Abi } from "./abi/registryV2";
import { managerAbi } from "./abi/manager";
import ListingGallery from "./components/ListingGallery";
import WalletBar from "./components/WalletBar";
import CancelListing from "./components/CancelListing";
import { parseEther } from "viem";
import './App.css';


import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";

function SectionRegister() {
  const { address } = useAccount();
  const [deposit, setDeposit] = useState("100");
  const [rent, setRent]     = useState("10");
  const [total, setTotal]   = useState("4");
  const [availableFrom, setAvailableFrom] = useState<number>(() => Math.floor(Date.now()/1000));
  const [metadataURI, setMetadataURI] = useState("");

  const { writeContractAsync } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}`|null>(null);
  const { isLoading: pending } = useWaitForTransactionReceipt({ hash: hash ?? undefined });
  const [err, setErr] = useState<string | null>(null);

  const onCreate = async () => {
    setErr(null);
    try {
      if (!metadataURI.trim()) throw new Error("메타데이터 URI를 입력하세요.");
      const d = parseEther(deposit || "0");
      const r = parseEther(rent || "0");
      const t = BigInt(total || "0");
      const af = BigInt(availableFrom || 0);
  
      const h = await writeContractAsync({
        address: ADDR.REGISTRY,
        abi: registryV2Abi,
        functionName: "createListing",
        args: [ADDR.LIVP, d, r, t, af, metadataURI.trim()],
        chainId: 11155111,
      });
      setHash(h);
    } catch (e:any) {
      setErr(e?.shortMessage || e?.message || String(e));
    }
  };

  return (
    <div className="card">
      <h2>매물 등록 (집주인)</h2>
      <div>내 주소: {address ?? "-"}</div>
      <div style={{display:"grid", gap:8, maxWidth:420}}>
      <label>메타데이터 URI:
  <input
    value={metadataURI}
    onChange={(e) => setMetadataURI(e.target.value)}
    placeholder="ipfs://bafy... or https://..."
  />
</label>
{err && <div style={{color:"#b33"}}>{err}</div>}
        <label>보증금(LIVP): <input value={deposit} onChange={e=>setDeposit(e.target.value)} /></label>
        <label>회차 임대료(LIVP): <input value={rent} onChange={e=>setRent(e.target.value)} /></label>
        <label>총 회차수(10분단위): <input value={total} onChange={e=>setTotal(e.target.value)} /></label>
        <label>입주 가능시각(unixtime): <input value={availableFrom} onChange={e=>setAvailableFrom(parseInt(e.target.value||"0"))} /></label>
        <button disabled={pending} onClick={onCreate}>{pending ? "트랜잭션 대기..." : "등록"}</button>
        {hash && <div>tx: {hash}</div>}
      </div>
      <small>주기: 600s(10분) 고정</small>
    </div>
  );
}

function SectionJoin() {
  const { address } = useAccount();
  const [listingId, setListingId] = useState("1");
  const { data: allowance } = useReadContract({
    address: ADDR.LIVP, abi: livpAbi, functionName: "allowance",
    args: [address ?? "0x0000000000000000000000000000000000000000", ADDR.MANAGER],
    query: { enabled: !!address }
  });
  const { writeContractAsync } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}`|null>(null);
  const { isLoading: pending } = useWaitForTransactionReceipt({ hash: hash ?? undefined });
  const needsApprove = !allowance || allowance === 0n;

  const approve = async () => {
    const h = await writeContractAsync({
      address: ADDR.LIVP, abi: livpAbi, functionName: "approve",
      args: [ADDR.MANAGER, 2n**256n - 1n], chainId: 11155111,
    });
    setHash(h);
  };
  const join = async () => {
    const h = await writeContractAsync({
      address: ADDR.MANAGER, abi: managerAbi, functionName: "joinLease",
      args: [BigInt(listingId)], chainId: 11155111,
    });
    setHash(h);
  };

  return (
    <div className="card">
      <h2>매물 조인 (세입자)</h2>
      <div>내 주소: {address ?? "-"}</div>
      <div style={{display:"grid", gap:8, maxWidth:420}}>
        <label>listingId: <input value={listingId} onChange={e=>setListingId(e.target.value)} /></label>
        <div>allowance: {allowance?.toString() ?? "-"}</div>
        {needsApprove
          ? <button disabled={pending} onClick={approve}>{pending ? "승인 대기..." : "LeaseManager에 approve"}</button>
          : <button disabled={pending} onClick={join}>{pending ? "조인 대기..." : "조인(joinLease)"}</button>
        }
        {hash && <div>tx: {hash}</div>}
      </div>
      <small>조인 시 보증금+1회차가 즉시 집주인에게 송금됩니다.</small>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div style={{display:"grid", gap:16, padding:16}}>
          <h1>월세 dApp (Sepolia)</h1>
          <WalletBar />
          <Balances />
          
          <ListingGallery />
          <SectionRegister />
          <SectionJoin />
          <PayPanel />
          <CancelListing />
          <p style={{opacity:.7, fontSize:12}}>
            주기 10분(600s) 고정 · LIVP 기반 · 보증금+임대료 자동/수동 납부
          </p>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
