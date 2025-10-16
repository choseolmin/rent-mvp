// frontend/src/abi/registryV2.ts
export const registryV2Abi = [
    {
      "type":"function","name":"createListing","stateMutability":"nonpayable",
      "inputs":[
        {"name":"token","type":"address"},
        {"name":"deposit","type":"uint256"},
        {"name":"rentPerPeriod","type":"uint256"},
        {"name":"totalPeriods","type":"uint256"},
        {"name":"availableFrom","type":"uint256"},
        {"name":"metadataURI","type":"string"}
      ],
      "outputs":[{"name":"id","type":"uint256"}]
    },
    { "type":"function","name":"cancelListing","stateMutability":"nonpayable","inputs":[{"name":"id","type":"uint256"}],"outputs":[] },
    { "type":"function","name":"getListing","stateMutability":"view","inputs":[{"name":"id","type":"uint256"}],
      "outputs":[
        {"name":"landlord","type":"address"},
        {"name":"token","type":"address"},
        {"name":"deposit","type":"uint256"},
        {"name":"rentPer","type":"uint256"},
        {"name":"total","type":"uint256"},
        {"name":"availableFrom","type":"uint256"},
        {"name":"uri","type":"string"}
      ]
    },
    { "type":"function","name":"manager","stateMutability":"view","inputs":[],"outputs":[{"type":"address"}] },
    { "type":"function","name":"nextListingId","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}] },
    { "type":"function","name":"owner","stateMutability":"view","inputs":[],"outputs":[{"type":"address"}] },
    { "type":"function","name":"setManager","stateMutability":"nonpayable","inputs":[{"name":"_manager","type":"address"}],"outputs":[] },
    { "type":"function","name":"listings","stateMutability":"view","inputs":[{"name":"id","type":"uint256"}],
      "outputs":[
        {"type":"address"},{"type":"address"},{"type":"uint256"},{"type":"uint256"},
        {"type":"uint256"},{"type":"uint256"},{"type":"string"}
      ]
    },
    { "type":"event","name":"ListingCreated","inputs":[
      {"indexed":true,"name":"id","type":"uint256"},
      {"indexed":true,"name":"landlord","type":"address"},
      {"indexed":false,"name":"metadataURI","type":"string"}
    ],"anonymous":false },
    { "type":"event","name":"ListingCancelled","inputs":[
      {"indexed":true,"name":"id","type":"uint256"},
      {"indexed":true,"name":"landlord","type":"address"}
    ],"anonymous":false }
  ] as const;
  