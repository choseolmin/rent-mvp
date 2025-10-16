
export const managerV2Abi = [
    {
      type: "function",
      name: "joinLease",
      inputs: [{ name: "listingId", type: "uint256" }],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "dueNow",
      inputs: [{ name: "leaseId", type: "uint256" }],
      outputs: [{ type: "bool" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "payRent",
      inputs: [{ name: "leaseId", type: "uint256" }],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "leases",
      inputs: [{ name: "leaseId", type: "uint256" }],
      outputs: [
        { name: "tenant", type: "address" },
        { name: "landlord", type: "address" },
        { name: "token", type: "address" },
        { name: "rentPerPeriod", type: "uint256" },
        { name: "nextDue", type: "uint256" },
        { name: "paidPeriods", type: "uint256" },
        { name: "totalPeriods", type: "uint256" },
        { name: "active", type: "bool" },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "consumed", // 새로 추가된 함수 (V2)
      inputs: [{ name: "listingId", type: "uint256" }],
      outputs: [{ type: "bool" }],
      stateMutability: "view",
    },
    {
      type: "event",
      name: "LeaseStarted",
      inputs: [
        { indexed: true, name: "leaseId", type: "uint256" },
        { indexed: true, name: "listingId", type: "uint256" },
        { indexed: true, name: "tenant", type: "address" },
        { indexed: true, name: "landlord", type: "address" },
      ],
    },
  ] as const;
  