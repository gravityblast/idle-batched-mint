const hre = require("hardhat");
const { signPermit, signPermitEIP2612, IdleTokens} = require("../lib");
const { ethers, upgrades } = require("hardhat");
const BN = require("bignumber.js");
const IERC20 = artifacts.require('IERC20Nonces');
const IdleTokenMock = artifacts.require('IdleTokenMock');
const IIdleTokenV3_1 = artifacts.require('IIdleTokenV3_1');
const IdleBatchedMint = artifacts.require('IdleBatchedMint');

const idleDAIRisk  = "0xa14eA0E11121e6E951E87c66AFe460A00BCD6A16";
const idleUSDCRisk = "0x3391bc034f2935ef0e1e41619445f998b2680d35";
const idleUSDTRisk = "0x28fAc5334C9f7262b3A3Fe707e250E01053e07b5";

// config
const CHAIN_ID = 1;
const network = "mainnet";

const holders = {
  bittrex: "0xfbb1b73c4f0bda4f67dca266ce6ef42f520fbb98",
  wbtc: "0xd1669ac6044269b59fa12c5822439f609ca54f41",
}

const scenarios = [
  // best
  {
    usePermit: true,
    signPermitFunc: signPermit,
    idleTokenAddress: IdleTokens[network].idleDAIBest,
    holder: holders.bittrex,
  },
  {
    usePermit: true,
    signPermitFunc: signPermitEIP2612,
    idleTokenAddress: IdleTokens[network].idleUSDCBest,
    holder: holders.bittrex,
  },
  {
    usePermit: false,
    idleTokenAddress: IdleTokens[network].idleUSDTBest,
    holder: holders.bittrex,
  },
  {
    usePermit: false,
    idleTokenAddress: IdleTokens[network].idleSUSDBest,
    holder: holders.bittrex,
  },
  {
    usePermit: false,
    idleTokenAddress: IdleTokens[network].idleTUSDBest,
    holder: holders.bittrex,
  },
  {
    usePermit: false,
    idleTokenAddress: IdleTokens[network].idleWBTCBest,
    holder: holders.wbtc,
  },
  // risk
  {
    usePermit: true,
    signPermitFunc: signPermit,
    idleTokenAddress: IdleTokens[network].idleDAIRisk,
    holder: holders.bittrex,
  },
  {
    usePermit: true,
    signPermitFunc: signPermitEIP2612,
    idleTokenAddress: IdleTokens[network].idleUSDCRisk,
    holder: holders.bittrex,
  },
  {
    usePermit: false,
    idleTokenAddress: IdleTokens[network].idleUSDTRisk,
    holder: holders.bittrex,
  },
];

const check = (a, b, message) => {
  let [icon, symbol] = a === b ? ["✔️", "==="] : ["🚨🚨🚨", "!=="];
  console.log(`${icon}  `, a, symbol, b, message ? message : "");
}

const toBN = (v) => new BN(v.toString());

const start = async ({ usePermit, signPermitFunc, idleTokenAddress, holder}) => {
  const underlyingAddress = await (await IdleTokenMock.at(idleTokenAddress)).token();
  const UnderlyingToken = await IERC20.at(underlyingAddress);
  const decimals = toBN(await UnderlyingToken.decimals()).toNumber();
  const IdleToken = await IIdleTokenV3_1.at(idleTokenAddress);

  const ONE_UNDERLYING_UNIT = toBN(10 ** decimals);
  const ONE_IDLE_UNIT = toBN(10 ** 18);

  const toUnderlyingUnit = (v) => toBN(v).div(ONE_UNDERLYING_UNIT);
  const fromUnderlyingUnit = (v) => toBN(v).times(ONE_UNDERLYING_UNIT);
  const toIdleUnit = (v) => toBN(v).div(ONE_IDLE_UNIT);
  const fromIdleUnit = (v) => toBN(v).times(ONE_IDLE_UNIT);

  console.log("using holder", holder);
  console.log("using idle token 🪙 " , (await IdleToken.name()), "-", idleTokenAddress);
  console.log("using underlying token", (await UnderlyingToken.name()), "-", underlyingAddress);
  console.log("holder balance", toUnderlyingUnit(await UnderlyingToken.balanceOf(holder)).toString());
  console.log(`underlying token decimals ${decimals}`);

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

  const deposit = async (accountIndex, amountInUnit, permit) => {
    const amount = fromUnderlyingUnit(amountInUnit).toString();

    console.log("⬇️  deposit");
    const account = accounts[accountIndex];
    console.log(`deposit of ${amountInUnit} (${(amount)}) from ${accountIndex} (${account})`)

    await UnderlyingToken.transfer(account, amount, { from: holder });

    if (permit) {
      const nonce = await UnderlyingToken.nonces(account);
      console.log("nonce:", nonce.toString())
      const expiry = Math.round(new Date().getTime() / 1000 + 3600);
      const erc20Name = await UnderlyingToken.name();
      const sig =  await signPermitFunc(UnderlyingToken.address, erc20Name, account, idleBatchedMint.address, amount, nonce, expiry, CHAIN_ID);
      const r = sig.slice(0, 66);
      const s = "0x" + sig.slice(66, 130);
      const v = "0x" + sig.slice(130, 132);

      if (signPermitFunc === signPermit) { // DAI
        console.log("calling permitAndDeposit");
        await idleBatchedMint.permitAndDeposit(amount, nonce, expiry, v, r, s, { from: account });
      } else {
        console.log("calling permitEIP2612AndDeposit"); // USDC
        await idleBatchedMint.permitEIP2612AndDeposit(amount, expiry, v, r, s, { from: account });
      }
    } else {
      console.log("calling approve");
      await UnderlyingToken.approve(idleBatchedMint.address, amount, { from: account });
      console.log("calling deposit");
      await idleBatchedMint.deposit(amount, { from: account });
    }

    const currBatch = await idleBatchedMint.currBatch();

    console.log(`account ${accountIndex} deposit`, (await idleBatchedMint.batchDeposits(account, currBatch)).toString());
    console.log("contract underlying balance", toUnderlyingUnit(await UnderlyingToken.balanceOf(idleBatchedMint.address)).toString());
    console.log("contract idle token balance", toIdleUnit(await IdleToken.balanceOf(idleBatchedMint.address)).toString());
  }

  await deposit(0, 10);
  await deposit(1, 30);
  await deposit(2, 50, usePermit);
  await deposit(2, 100, usePermit);

  const underlyingTokenBalanceBefore = toUnderlyingUnit(await UnderlyingToken.balanceOf(idleBatchedMint.address));
  console.log("⬆️  calling executeBatch")
  await idleBatchedMint.executeBatch(true, { from: holder });
  console.log("executeBatch done")

  const idleTokenBalanceAfter = toIdleUnit(await IdleToken.balanceOf(idleBatchedMint.address));
  const priceExecute = underlyingTokenBalanceBefore.div(idleTokenBalanceAfter);
  console.log("contract underlying balance", toUnderlyingUnit(await UnderlyingToken.balanceOf(idleBatchedMint.address)).toString());
  console.log("contract idle token balance", idleTokenBalanceAfter.toString());
  console.log("price used at execute batch", underlyingTokenBalanceBefore.div(idleTokenBalanceAfter).toString())
  check(toIdleUnit(await IdleToken.balanceOf(accounts[0])).toString(), "0", "idle token balance before withdraw should be 0");
  check(toIdleUnit(await IdleToken.balanceOf(accounts[1])).toString(), "0", "idle token balance before withdraw should be 0");
  check(toIdleUnit(await IdleToken.balanceOf(accounts[2])).toString(), "0", "idle token balance before withdraw should be 0");

  await idleBatchedMint.withdraw(0, { from: accounts[0] });
  await idleBatchedMint.withdraw(0, { from: accounts[1] });
  await idleBatchedMint.withdraw(0, { from: accounts[2] });

  check(toIdleUnit(await IdleToken.balanceOf(accounts[0])).toString(), toBN("10").times(ONE_IDLE_UNIT).div(priceExecute).div(ONE_IDLE_UNIT).toString());
  check(toIdleUnit(await IdleToken.balanceOf(accounts[1])).toString(), toBN("30").times(ONE_IDLE_UNIT).div(priceExecute).div(ONE_IDLE_UNIT).toString());
  check(toIdleUnit(await IdleToken.balanceOf(accounts[2])).toString(), toBN("150").times(ONE_IDLE_UNIT).div(priceExecute).div(ONE_IDLE_UNIT).toString());
}

const main = async () => {
  for (var i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    console.log("➡️  STARTING NEW SCENARIO ⬅️");
    await start(s);
  };
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
