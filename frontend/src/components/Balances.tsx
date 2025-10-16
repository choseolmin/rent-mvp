import { useAccount, usePublicClient, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDR } from "../addresses";
import { livpAbi } from "../abi/livp";

export default function Balances() {
  const { address } = useAccount();
  const pc = usePublicClient({ chainId: 11155111 });
  const { data: livp } = useReadContract({
    address: ADDR.LIVP, abi: livpAbi, functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address }
  });
  const { data: allowance } = useReadContract({
    address: ADDR.LIVP, abi: livpAbi, functionName: "allowance",
    args: [address ?? "0x0000000000000000000000000000000000000000", ADDR.MANAGER],
    query: { enabled: !!address }
  });

  const [hash, setHash] = useState<`0x${string}`|null>(null);
  const { isLoading: pending } = useWaitForTransactionReceipt({ hash: hash ?? undefined });
  const { writeContractAsync } = useWriteContract();

  async function approveMax() {
    const h = await writeContractAsync({
      address: ADDR.LIVP, abi: livpAbi, functionName: "approve",
      args: [ADDR.MANAGER, (2n**256n - 1n)], chainId: 11155111
    });
    setHash(h);
  }

  if (!address) return <div className="card">지갑 연결 필요</div>;
  if (!pc) return <div className="card">로딩중…</div>;

  return (
    <div className="card">
      <h2>내 잔고 / 승인 상태</h2>
      <div>내 주소: {address}</div>
      <div>ETH 블록: {(pc as any) && "확인됨"}</div>
      <div>LIVP: {livp ? livp.toString() : "-"}</div>
      <div>allowance(→LeaseManager): {allowance ? allowance.toString() : "-"}</div>
      <div style={{marginTop:8}}>
        <button onClick={approveMax} disabled={pending}>
          {pending ? "승인 트랜잭션 대기..." : "LeaseManager에 Max approve"}
        </button>
        {hash && <div>tx: {hash}</div>}
      </div>
    </div>
  );
}

import { useState } from "react";
