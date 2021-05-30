const HDWalletProvider = require("truffle-hdwallet-provider");
const fs = require("fs");
const mnemonic = fs.readFileSync(".secret").toString().trim();

module.exports = {
  plugins: ["truffle-plugin-verify"],
  compilers: {
    solc: {
      version: "0.6.12",
    },
  },
  networks: {
    bsc: {
      provider: () =>
        new HDWalletProvider(mnemonic, `https://bsc-dataseed1.binance.org`),
      network_id: 56,
      confirmations: 10,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
  },
};
