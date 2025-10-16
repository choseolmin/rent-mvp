import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState } from "react";
import { ADDR } from "../addresses";
import { livpAbi } from "../abi/livp";
import { parseEther } from "viem";

export default function LandlordFaucet() {
  const { address } = useAccount();
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("50"); // 기본 50 LIVP
  const [hash, setHash] = useState<`0x${string}`|null>(null);
  const { writeContractAsync } = useWriteContract();
  const { isLoading: pending } = useWaitForTransactionReceipt({ hash: hash ?? undefined });

  // 집주인 주소만 전송 버튼을 보여주고 싶다면 주소 하드코드로 체크 가능
  // const landlord = import.meta.env.VITE_LANDLORD as `0x${string}`;  // 선택
  // if (address?.toLowerCase() !== landlord?.toLowerCase()) return null;

  const onSend = async () => {
    const h = await writeContractAsync({
      address: ADDR.LIVP,
      abi: livpAbi,
      functionName: "transfer",
      args: [to as `0x${string}`, parseEther(amt)],
      chainId: 11155111,
    });
    setHash(h);
  };

  return (
    <div className="card">
      <h2>(집주인 전용) 세입자에 LIVP 전송</h2>
      <div>내 주소: {address ?? "-"}</div>
      <div style={{display:"grid", gap:8, maxWidth:420}}>
        <label>받는 주소: <input placeholder="0x..." value={to} onChange={e=>setTo(e.target.value)} /></label>
        <label>금액(LIVP): <input value={amt} onChange={e=>setAmt(e.target.value)} /></label>
        <button onClick={onSend} disabled={pending || !to}>
          {pending ? "전송 중..." : "전송"}
        </button>
        {hash && <div>tx: {hash}</div>}
      </div>
      <small>세입자에게 보증금+1회차 이상을 충전하세요.</small>
    </div>
  );
}
