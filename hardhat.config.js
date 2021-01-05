require("@nomiclabs/hardhat-truffle5");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require('chai').should();
const BN = require("bignumber.js");

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
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000
      }
    }
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
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  }
};

task("stats", "prints stats about a specific IdleBatchedMint contract")
  .addParam("address", "the contract address")
  .setAction(async ({ address }) => {
    const toBN = (v) => new BN(v.toString());

    const IdleBatchedMint = artifacts.require('IdleBatchedMint');
    const ERC20 = artifacts.require('IERC20Permit');

    const contract = await IdleBatchedMint.at(address);

    const idleTokenAddress = await contract.idleToken();
    const idleToken = await ERC20.at(idleTokenAddress)
    const idleTokenName = await idleToken.name();
    const idleTokenBalance = await idleToken.balanceOf(address);

    const underlyingTokenAddress = await contract.underlying();
    const underlyingToken = await ERC20.at(underlyingTokenAddress)
    const underlyingTokenName = await underlyingToken.name();
    const underlyingTokenBalance = await underlyingToken.balanceOf(address);

    const decimals = await underlyingToken.decimals();
    const ONE_UNDERLYING_UNIT = toBN(10 ** decimals);
    const ONE_IDLE_UNIT = toBN(10 ** 18);

    const currBatch = await contract.currBatch();

    console.log("");
    console.log("idleToken:", idleTokenName, idleTokenAddress);
    console.log("idleToken balance:", idleTokenBalance.div(ONE_IDLE_UNIT).toString());
    console.log("underlyingToken:", underlyingTokenName, underlyingTokenAddress);
    console.log("underlyingToken balance:", underlyingTokenBalance.div(ONE_UNDERLYING_UNIT).toString());
    console.log("currBatch:", currBatch.toString());
    console.log("");

    for (let i = parseInt(currBatch); i >= 0; i--) {
      console.log(`batch ${i}`);
      const batchTotals = await contract.batchTotals(i);
      const batchRedeemedTotals = await contract.batchRedeemedTotals(i);

      console.log("  balance", batchTotals.div(ONE_UNDERLYING_UNIT).toString());
      console.log("  redeemed", batchRedeemedTotals.div(ONE_IDLE_UNIT).toString());
    }
  });
