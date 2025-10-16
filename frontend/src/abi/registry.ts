export const registryAbi = [
    // Listing struct getter
    { "type":"function","name":"listings","inputs":[{"name":"id","type":"uint256"}],
      "outputs":[
        {"name":"landlord","type":"address"},
        {"name":"payToken","type":"address"},
        {"name":"deposit","type":"uint256"},
        {"name":"rentPerPeriod","type":"uint256"},
        {"name":"totalPeriods","type":"uint256"},
        {"name":"availableFrom","type":"uint256"},
        {"name":"active","type":"bool"}
      ], "stateMutability":"view" },
    // create
    { "type":"function","name":"createListing",
      "inputs":[
        {"name":"payToken","type":"address"},
        {"name":"deposit","type":"uint256"},
        {"name":"rentPerPeriod","type":"uint256"},
        {"name":"totalPeriods","type":"uint256"},
        {"name":"availableFrom","type":"uint256"}
      ],
      "outputs":[{"type":"uint256"}],
      "stateMutability":"nonpayable"
    },
    // 이벤트(선택)
    { "type":"event","name":"ListingCreated","inputs":[
      {"indexed":true,"name":"id","type":"uint256"},
      {"indexed":true,"name":"landlord","type":"address"}
    ]}
  ] as const;
  