export const livpAbi = [
    // read
    { "type":"function","name":"decimals","inputs":[],"outputs":[{"type":"uint8"}], "stateMutability":"view" },
    { "type":"function","name":"balanceOf","inputs":[{"name":"a","type":"address"}],"outputs":[{"type":"uint256"}],"stateMutability":"view" },
    { "type":"function","name":"allowance","inputs":[{"name":"o","type":"address"},{"name":"s","type":"address"}],"outputs":[{"type":"uint256"}],"stateMutability":"view" },
    // write
    { "type":"function","name":"approve","inputs":[{"name":"s","type":"address"},{"name":"amt","type":"uint256"}],"outputs":[{"type":"bool"}],"stateMutability":"nonpayable" },
    { "type":"function","name":"transfer","inputs":[{"name":"to","type":"address"},{"name":"amt","type":"uint256"}],"outputs":[{"type":"bool"}],"stateMutability":"nonpayable" }
  ] as const;
  