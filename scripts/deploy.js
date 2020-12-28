const { ethers, upgrades } = require("hardhat");

const idleDAIBest  = "0x3fE7940616e5Bc47b0775a0dccf6237893353bB4";
const idleUSDCBest = "0x5274891bEC421B39D23760c04A6755eCB444797C";
const idleUSDTBest = "0xF34842d05A1c888Ca02769A633DF37177415C2f8";
const idleSUSDBest = "0xf52cdcd458bf455aed77751743180ec4a595fd3f";
const idleTUSDBest = "0xc278041fDD8249FE4c1Aad1193876857EEa3D68c";
const idleWBTCBest = "0x8C81121B15197fA0eEaEE1DC75533419DcfD3151";

const idleDAIRisk  = "0xa14eA0E11121e6E951E87c66AFe460A00BCD6A16";
const idleUSDCRisk = "0x3391bc034f2935ef0e1e41619445f998b2680d35";
const idleUSDTRisk = "0x28fAc5334C9f7262b3A3Fe707e250E01053e07b5";

async function main() {
  // Deploying
  const IdleBatchedMint = await ethers.getContractFactory("IdleBatchedMint");
  const proxy = await upgrades.deployProxy(IdleBatchedMint, [idleDAIBest]);
  await proxy.deployed();
  console.log("proxy deployed at", proxy.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
