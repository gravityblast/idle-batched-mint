const { ethers, upgrades } = require("hardhat");

const idleDAIToken = "0x3fE7940616e5Bc47b0775a0dccf6237893353bB4";

async function main() {
  // Deploying
  const IdleBatchedMint = await ethers.getContractFactory("IdleBatchedMint");
  const proxy = await upgrades.deployProxy(IdleBatchedMint, [idleDAIToken]);
  await proxy.deployed();
  console.log("proxy deployed at", proxy.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
