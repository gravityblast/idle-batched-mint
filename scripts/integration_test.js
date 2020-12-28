const hre = require("hardhat");
const { signPermit } = require("../lib");
const { ethers, upgrades } = require("hardhat");
const IERC20 = artifacts.require('IERC20Permit');
const IdleBatchedMint = artifacts.require('IdleBatchedMint');

const CHAIN_ID = 1;

const idleDAIBest  = "0x3fE7940616e5Bc47b0775a0dccf6237893353bB4";
const idleUSDCBest = "0x5274891bEC421B39D23760c04A6755eCB444797C";
const idleUSDTBest = "0xF34842d05A1c888Ca02769A633DF37177415C2f8";
const idleSUSDBest = "0xf52cdcd458bf455aed77751743180ec4a595fd3f";
const idleTUSDBest = "0xc278041fDD8249FE4c1Aad1193876857EEa3D68c";
const idleWBTCBest = "0x8C81121B15197fA0eEaEE1DC75533419DcfD3151";

const idleDAIRisk  = "0xa14eA0E11121e6E951E87c66AFe460A00BCD6A16";
const idleUSDCRisk = "0x3391bc034f2935ef0e1e41619445f998b2680d35";
const idleUSDTRisk = "0x28fAc5334C9f7262b3A3Fe707e250E01053e07b5";

const daiAddress   = "0x6b175474e89094c44da98b954eedeac495271d0f";

// config
const holder = process.env.HOLDER;
const idleTokenAddress = idleDAIBest;
const underlyingAddress   = daiAddress;

const main = async () => {
  const UnderlyingToken = await IERC20.at(underlyingAddress);
  const IdleToken = await IERC20.at(idleTokenAddress);

  // deploy
  const factory = await ethers.getContractFactory("IdleBatchedMint");
  const instance = await upgrades.deployProxy(factory, [IdleToken.address]);
  await instance.deployed();
  console.log("proxy deployed at", instance.address)
  const idleBatchedMint = await IdleBatchedMint.at(instance.address);

  // accounts
  const accounts = await web3.eth.getAccounts();
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [holder]}
  );

  const deposit = async (accountIndex, amount, permit) => {
    console.log("*********************************************************************");
    const account = accounts[accountIndex];
    console.log(`deposit of ${amount} from ${accountIndex} (${account})`)

    await UnderlyingToken.transfer(account, amount, { from: holder });

    if (permit) {
      const nonce = await UnderlyingToken.nonces(account);
      console.log("nonce:", nonce.toString())
      const expiry = Math.round(new Date().getTime() / 1000 + 3600);
      const sig =  await signPermit(UnderlyingToken.address, account, idleBatchedMint.address, nonce, expiry, CHAIN_ID);
      const r = sig.slice(0, 66);
      const s = "0x" + sig.slice(66, 130);
      const v = "0x" + sig.slice(130, 132);

      console.log("calling permitAndDeposit");
      await idleBatchedMint.permitAndDeposit(amount, nonce, expiry, v, r, s, { from: account });
    } else {
      console.log("calling approve");
      await UnderlyingToken.approve(idleBatchedMint.address, amount, { from: account });
      console.log("calling deposit");
      await idleBatchedMint.deposit(amount, { from: account });
    }

    const currBatch = await idleBatchedMint.currBatch();

    console.log(`account ${accountIndex} deposit`, (await idleBatchedMint.batchDeposits(account, currBatch)).toString());
    console.log("contract underlying balance", (await UnderlyingToken.balanceOf(idleBatchedMint.address)).toString());
    console.log("contract idle token balance", (await IdleToken.balanceOf(idleBatchedMint.address)).toString());
    console.log("*********************************************************************");
  }

  await deposit(0, 10);
  await deposit(1, 30);
  await deposit(2, 50, true);
  await deposit(2, 100, true);

  console.log("calling executeBatch")
  await idleBatchedMint.executeBatch(true, { from: holder });
  console.log("executeBatch done")
  console.log("contract underlying balance", (await UnderlyingToken.balanceOf(idleBatchedMint.address)).toString());
  console.log("contract idle token balance", (await IdleToken.balanceOf(idleBatchedMint.address)).toString());
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

