import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { ADDR } from "../addresses";
import { registryV2Abi } from "../abi/registryV2";

// ManagerV2의 consumed(listingId)만 쓰는 미니 ABI
const managerV2MiniAbi = [
  {
    type: "function",
    name: "consumed",
    stateMutability: "view",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
] as const;

interface Listing {
  id: bigint;
  landlord: string;
  token: string;
  deposit: bigint;
  rentPer: bigint;
  total: bigint;
  availableFrom: bigint;
  metadataURI: string;
  metadata?: {
    image?: string;
    title?: string;
    desc?: string;
    size?: string;
    maintenance?: string;
    subway?: string;
  };
}

const fmt = (wei: bigint) => (Number(wei) / 1e18).toLocaleString();

export default function ListingGallery() {
  const [listings, setListings] = useState<Listing[]>([]);


  // nextListingId 조회
  const { data: nextListingId } = useReadContract({
    address: ADDR.REGISTRY,
    abi: registryV2Abi,
    functionName: "nextListingId",
  });

  useEffect(() => {
    if (!nextListingId) return;
    const n = Number(nextListingId); // 총 발급된 listingId 최대값
    

    (async () => {
      const { ethers } = await import("ethers");
      const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_SEPOLIA);

      const reg = new ethers.Contract(ADDR.REGISTRY, registryV2Abi, provider);
      const man = new ethers.Contract(ADDR.MANAGER, managerV2MiniAbi, provider);

      const results: Listing[] = [];

      // 최신이 먼저 보이도록 뒤에서 앞으로 루프(또는 끝에 reverse 해도 OK)
      for (let i = n; i >= 1; i--) {
        try {
          const L = await reg.getListing(i);
          const landlord: string = L[0];

          // 취소된 매물(삭제됨) 필터
          if (!landlord || landlord === "0x0000000000000000000000000000000000000000") {
            continue;
          }

          // 이미 소비(조인)된 매물 필터
          const isConsumed: boolean = await man.consumed(i);
          if (isConsumed) continue;

          const metaUri: string = L[6];
          let metadata: Listing["metadata"] | undefined;
          if (metaUri && (metaUri.startsWith("ipfs://") || metaUri.startsWith("http"))) {
            try {
              const url = metaUri.replace("ipfs://", "https://ipfs.io/ipfs/");
              const res = await fetch(url);
              metadata = await res.json();
              // image가 ipfs://면 http 게이트웨이로 치환
              if (metadata?.image?.startsWith("ipfs://")) {
                metadata.image = metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/");
              }
            } catch {
              // 메타데이터 fetch 실패는 무시
            }
          }

          results.push({
            id: BigInt(i),
            landlord,
            token: L[1],
            deposit: L[2],
            rentPer: L[3],
            total: L[4],
            availableFrom: L[5],
            metadataURI: metaUri,
            metadata,
          });
        } catch {
          // getListing 실패한 id는 건너뜀
        }
      }

      setListings(results);
    })();
  }, [nextListingId]);

  return (
    <div>
      <h2>등록 가능한 매물 ({listings.length}개)</h2>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {listings.map((L) => (
          <div key={L.id.toString()} className="rounded-2xl border shadow p-3 hover:shadow-lg transition">
            <img
              src={L.metadata?.image || "https://via.placeholder.com/300x200?text=No+Image"}
              alt=""
              className="rounded-xl mb-2 w-full h-40 object-cover"
            />
            <div className="font-bold">
              월세 {fmt(L.deposit)} / {fmt(L.rentPer)}
            </div>
            <div className="text-sm opacity-70">
              {L.metadata?.title || "원룸"} · {L.metadata?.size || "면적 미상"}
            </div>
            <div className="text-sm opacity-70">
              관리비 {L.metadata?.maintenance || "-"} · {L.metadata?.subway || "-"}
            </div>
            <div className="text-xs opacity-60 mt-1">{L.metadata?.desc || "등록된 설명이 없습니다."}</div>
            <div className="text-xs mt-1 text-right opacity-50">ID #{L.id.toString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
