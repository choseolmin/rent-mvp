import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useEffect, useState } from "react";
import { ADDR } from "../addresses";
import { managerAbi } from "../abi/manager";

export default function PayPanel() {
  const { address } = useAccount();
  const pc = usePublicClient({ chainId: 11155111 });
  const [leaseId, setLeaseId] = useState("1");
  const [due, setDue] = useState<boolean | null>(null);
  const [hash, setHash] = useState<`0x${string}`|null>(null);
  const { writeContractAsync } = useWriteContract();
  const { isLoading: pending } = useWaitForTransactionReceipt({ hash: hash ?? undefined });

  useEffect(() => {
    (async () => {
      if (!pc) return;
      try {
        const d = await pc.readContract({
          address: ADDR.MANAGER,
          abi: managerAbi,
          functionName: "dueNow",
          args: [BigInt(leaseId)],
        }) as boolean;
        setDue(d);
      } catch {
        setDue(null);
      }
    })();
  }, [pc, leaseId]);

  const onPay = async () => {
    const h = await writeContractAsync({
      address: ADDR.MANAGER,
      abi: managerAbi,
      functionName: "payRent",
      args: [BigInt(leaseId)],
      chainId: 11155111,
    });
    setHash(h);
  };

  return (
    <div className="card">
      <h2>수동 납부 (세입자)</h2>
      <div>내 주소: {address ?? "-"}</div>
      <div style={{display:"grid", gap:8, maxWidth:420}}>
        <label>leaseId: <input value={leaseId} onChange={e=>setLeaseId(e.target.value)} /></label>
        <div>dueNow: {due === null ? "-" : String(due)}</div>
        <button onClick={onPay} disabled={pending || due === false}>
          {pending ? "납부중..." : "payRent 실행"}
        </button>
        {hash && <div>tx: {hash}</div>}
      </div>
      <small>자동납부 크론이 돌고 있다면, 여기선 상태 확인용으로만 사용해도 됩니다.</small>
    </div>
  );
}
