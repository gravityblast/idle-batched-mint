const { ethers, upgrades } = require("hardhat");
const { IdleTokens} = require("../lib");

const network = "mainnet";

async function main() {
  for (token in IdleTokens[network]) {
    const tokenAddress = IdleTokens[network][token];
    console.log(`deploying IdleBatchedMint for ${token} (${tokenAddress})`);
    const IdleBatchedMint = await ethers.getContractFactory("IdleBatchedMint");
    const proxy = await upgrades.deployProxy(IdleBatchedMint, [tokenAddress]);
    await proxy.deployed();
    console.log(`${token} proxy deployed at`, proxy.address)
    console.log("***************************************************************************************");
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
