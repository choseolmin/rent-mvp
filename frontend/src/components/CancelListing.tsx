
import { useState, useMemo } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { ADDR } from "../addresses";
import { registryV2Abi } from "../abi/registryV2";
import { managerV2Abi } from "../abi/managerV2"; // ⚠ ManagerV2 ABI (consumed(listingId) view)

export default function CancelListing() {
  const { address } = useAccount();
  const [listingId, setListingId] = useState("");
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();
  const { isLoading: pending, isSuccess } = useWaitForTransactionReceipt({
    hash: hash ?? undefined,
  });

  // 안전한 BigInt 파싱
  const lid = useMemo(() => {
    try {
      return listingId.trim() ? BigInt(listingId.trim()) : null;
    } catch {
      return null;
    }
  }, [listingId]);

  // 레지스트리에서 listing 정보 조회 (집주인 확인 / 메타데이터 확인)
  const { data: listing } = useReadContract({
    address: ADDR.REGISTRY,
    abi: registryV2Abi,
    functionName: "getListing",
    args: lid ? [lid] : undefined,
    query: { enabled: !!lid },
  });
  const landlord = (listing as any)?.[0] as `0x${string}` | undefined;
  const metadataURI = (listing as any)?.[6] as string | undefined;
  const isOwner = landlord && address && landlord.toLowerCase() === address.toLowerCase();

  // ManagerV2의 consumed 체크 (이미 조인된 매물은 취소 불가)
  const { data: isConsumed } = useReadContract({
    address: ADDR.MANAGER,       // ManagerV2 주소
    abi: managerV2Abi,
    functionName: "consumed",
    args: lid ? [lid] : undefined,
    query: { enabled: !!lid },
  });

  const onCancel = async () => {
    setErr(null);
    if (!lid) {
      setErr("유효한 listingId를 입력하세요.");
      return;
    }
    if (!isOwner) {
      setErr("해당 매물의 집주인 계정으로만 취소할 수 있습니다.");
      return;
    }
    if (isConsumed) {
      setErr("이미 조인(consumed)된 매물은 취소할 수 없습니다.");
      return;
    }

    try {
      const h = await writeContractAsync({
        address: ADDR.REGISTRY,
        abi: registryV2Abi,
        functionName: "cancelListing",
        args: [lid],
        chainId: 11155111,
        // ✅ 가스 자동 추정이 과하게 잡히는 문제를 피하기 위해 수동 지정
        gas: 200_000n,
      });
      setHash(h);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || String(e));
    }
  };

  return (
    <div className="card">
      <h2>매물 취소 (집주인)</h2>
      <div>내 주소: {address ?? "-"}</div>

      <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <label>
          listingId:&nbsp;
          <input
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            placeholder="예: 1"
            inputMode="numeric"
          />
        </label>

        {lid && (
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            <div>집주인: {landlord ?? "-"}</div>
            <div>메타데이터: {metadataURI ?? "-"}</div>
            <div>내가 집주인? {isOwner ? "✅" : "❌"}</div>
            <div>이미 조인됨(consumed)? {isConsumed ? "✅" : "❌"}</div>
          </div>
        )}

        <button disabled={pending || !lid} onClick={onCancel}>
          {pending ? "취소 트랜잭션 대기..." : "취소(cancelListing)"}
        </button>

        {hash && (
          <div>
            tx: {hash} {isSuccess && "✅ 완료"}
          </div>
        )}
        {err && <div style={{ color: "#b33" }}>{err}</div>}
      </div>

      <small>
        이미 조인(consumed)된 매물은 취소가 거절됩니다. 가스 한도 추정 이슈를 피하기 위해
        트랜잭션 가스를 적절히(예: 200k) 수동 지정했습니다.
      </small>
    </div>
  );
}
