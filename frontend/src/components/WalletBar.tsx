import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";

export default function WalletBar() {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();

  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const injected = connectors.find((c) => c.id === "injected");

  const onConnect = () => {
    const chosen = injected ?? connectors[0];
    if (!chosen) {
      alert("사용 가능한 지갑 커넥터가 없습니다. (Metamask 등 설치 확인)");
      return;
    }
    connect({ connector: chosen });
  };

  const short = (a?: string) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "-");

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0" }}>
      <b>지갑</b>
      <span>{isConnected ? short(address) : "연결 안 됨"}</span>
      <span style={{ opacity: 0.7 }}>체인: {chainId ?? "-"}</span>

      {!isConnected ? (
        <button
          onClick={onConnect}
          disabled={isConnecting || connectors.length === 0}
          title={connectors.length === 0 ? "사용 가능한 커넥터 없음" : undefined}
        >
          {isConnecting ? "지갑 연결중..." : "지갑 연결"}
        </button>
      ) : (
        <button onClick={() => disconnect()}>연결 해제</button>
      )}

      {isConnected && chainId !== 11155111 && (
        <>
          <span style={{ color: "#b33" }}>⚠ Sepolia로 전환 필요</span>
          <button onClick={() => switchChain({ chainId: 11155111 })} disabled={isSwitching}>
            {isSwitching ? "전환 중..." : "Sepolia로 전환"}
          </button>
        </>
      )}

      <small style={{ opacity: 0.6 }}>status: {status}</small>
    </div>
  );
}
