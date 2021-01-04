require("@nomiclabs/hardhat-truffle5");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require('chai').should();


// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const mainnetAccounts = process.env.MAINNET_PRIVATE_KEY ? [`0x${process.env.MAINNET_PRIVATE_KEY}`] : [];
const kovanAccounts = process.env.KOVAN_PRIVATE_KEY ? [`${process.env.KOVAN_PRIVATE_KEY}`] : [];

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.6.12",
      },
      {
        version: "0.7.6",
      }
    ]
  },
  networks: {
    hardhat: {},
    local: {
      url: "http://127.0.0.1:8545/",
      timeout: 120000,
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${process.env.IDLE_INFURA_KEY}`,
      accounts: kovanAccounts,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.IDLE_INFURA_KEY}`,
      accounts: mainnetAccounts,
    },
  },
};

