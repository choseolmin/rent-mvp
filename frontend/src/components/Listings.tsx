import { useEffect, useState } from "react";
import { usePublicClient, useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ADDR } from "../addresses";
import { registryAbi } from "../abi/registry";
import { livpAbi } from "../abi/livp";
import { managerAbi } from "../abi/manager";
import type { Address } from "viem";

type ListingRow = {
  id: bigint;
  landlord: Address;
  payToken: Address;
  deposit: bigint;
  rentPerPeriod: bigint;
  totalPeriods: bigint;
  availableFrom: bigint;
  active: boolean;
};

export default function Listings() {
  const pc = usePublicClient({ chainId: 11155111 });
  const { address } = useAccount();

  // 최근 블록 ~ 과거 N 블록 범위에서 이벤트 스캔
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hash, setHash] = useState<`0x${string}`|null>(null);
  const { isLoading: pending } = useWaitForTransactionReceipt({ hash: hash ?? undefined, chainId: 11155111 });

  if (!pc) return <div className="card">로딩중…</div>;

  // 내 allowance 조회 (있으면 바로 조인 버튼 보여주기)
  const { data: allowance } = useReadContract({
    address: ADDR.LIVP,
    abi: livpAbi,
    functionName: "allowance",
    args: [ (address ?? "0x0000000000000000000000000000000000000000") as Address, ADDR.MANAGER ],
    query: { enabled: !!address }
  });

  const needsApprove = (allowance ?? 0n) === 0n;

  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const latest = await pc.getBlockNumber();
        // 너무 과거까지 가지 말고 최근 50k 블록만
        const from = latest > 50_000n ? latest - 50_000n : 0n;

        const logs = await pc.getLogs({
          address: ADDR.REGISTRY,
          fromBlock: from,
          toBlock: "latest",
          // Event 시그니처: ListingCreated(uint256 id, ...)
          // wagmi/viem에서 abi + eventName 지정 가능
          events: [{
            type: "event",
            name: "ListingCreated",
            inputs: [{ type: "uint256", name: "id", indexed: true }],
          } as any],
        });

        const ids = Array.from(new Set(
          logs
            .map(l => (l as any).args?.id as bigint)
            .filter(Boolean)
        )).sort((a,b)=> Number(b - a)).slice(0,20); // 최신 20개

        // 각 id로 listings(id) 조회
        const results = await Promise.all(ids.map(async (id) => {
          const L = await pc.readContract({
            address: ADDR.REGISTRY,
            abi: registryAbi,
            functionName: "listings",
            args: [id],
          }) as unknown as ListingRow;
          return { ...L, id };
        }));

        setRows(results.filter(r => r.active)); // active만 표시(원하면 전부 표시)
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [pc]);

  const approve = async () => {
    const h = await writeContractAsync({
      address: ADDR.LIVP,
      abi: livpAbi,
      functionName: "approve",
      args: [ADDR.MANAGER, 2n**256n - 1n],
      chainId: 11155111,
    });
    setHash(h);
  };

  const join = async (id: bigint) => {
    const h = await writeContractAsync({
      address: ADDR.MANAGER,
      abi: managerAbi,
      functionName: "joinLease",
      args: [id],
      chainId: 11155111,
    });
    setHash(h);
  };

  const fmt = (x: bigint) => (Number(x) / 1e18).toLocaleString();

  return (
    <div className="card">
      <h2>매물 리스트</h2>
      {loading ? <div>로딩중…</div> : rows.length === 0 ? <div>표시할 매물이 없습니다.</div> : (
        <table style={{borderCollapse:"collapse", width:"100%", maxWidth:780}}>
          <thead>
            <tr>
              <th align="left">ID</th>
              <th align="left">집주인</th>
              <th align="right">보증금</th>
              <th align="right">10분 임대료</th>
              <th align="right">총 회차</th>
              <th align="right">입주 가능(UTC)</th>
              <th align="center">액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id.toString()}>
                <td>{r.id.toString()}</td>
                <td>{r.landlord.slice(0,6)}…{r.landlord.slice(-4)}</td>
                <td align="right">{fmt(r.deposit)} LIVP</td>
                <td align="right">{fmt(r.rentPerPeriod)} LIVP</td>
                <td align="right">{r.totalPeriods.toString()}</td>
                <td align="right">{new Date(Number(r.availableFrom)*1000).toISOString().slice(0,19).replace("T"," ")}</td>
                <td align="center">
                  {!address ? (
                    <span>지갑 연결</span>
                  ) : needsApprove ? (
                    <button onClick={approve} disabled={pending}>approve</button>
                  ) : (
                    <button onClick={()=>join(r.id)} disabled={pending}>조인</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {hash && <div style={{marginTop:8}}>tx: {hash}</div>}
    </div>
  );
}
