const hre = require("hardhat");
const rl = require("readline");
const { ethers, upgrades } = require("hardhat");
const { IdleTokens} = require("../lib");

const prompt = (question) => {
  const r = rl.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  return new Promise((resolve, error) => {
    r.question(question, answer => {
      r.close()
      resolve(answer)
    });
  })
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;
  console.log("runing on network", hre.network.name)
  console.log("deploying with account", deployer.address);
  console.log("account balance", (await deployer.getBalance()).toString(), "\n\n");

  const answer = await prompt("continue? [y/n]");
  if (answer !== "y" && answer !== "yes") {
    console.log("exiting...");
    process.exit(1);
  }

  console.log("starting...")

  for (token in IdleTokens[network]) {
    const tokenAddress = IdleTokens[network][token];
    console.log(`deploying IdleBatchedMint for ${token} (${tokenAddress})`);
    const IdleBatchedMint = await ethers.getContractFactory("IdleBatchedMint");
    const args = [tokenAddress];
    const proxy = await upgrades.deployProxy(IdleBatchedMint, args);
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
