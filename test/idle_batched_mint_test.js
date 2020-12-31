const { expectEvent, singletons, constants, BN, expectRevert } = require('@openzeppelin/test-helpers');
const { ethers, upgrades } = require("hardhat");
const { signPermit } = require("../lib");

const DAIMock = artifacts.require('DAIMock');
const IdleTokenMock = artifacts.require('IdleTokenMock');
const IdleBatchedMint = artifacts.require('IdleBatchedMint');

const BNify = n => new BN(String(n));

contract('IdleBatchedMint', function ([_, owner, govOwner, manager, user1, user2, user3, user4]) {
  beforeEach(async () => {
    this.one = new BN('1000000000000000000');
    this.DAIMock = await DAIMock.new({ from: owner });
    this.token = await IdleTokenMock.new(this.DAIMock.address, { from: owner });

    const signers = await ethers.getSigners();
    const contract = (await ethers.getContractFactory("IdleBatchedMint")).connect(signers[1]);
    const instance = await upgrades.deployProxy(contract, [this.token.address]);
    this.batchedMint = await IdleBatchedMint.at(instance.address);
  });

  it("creates batches", async () => {
    const deposit = async (user, amount) => {
      // transfer amount from owner to user
      await this.DAIMock.transfer(user, amount, { from: owner });
      // approve from user to contract
      await this.DAIMock.approve(this.batchedMint.address, amount, { from: user });
      // call deposit
      await this.batchedMint.deposit(amount, { from: user });
    }

    const permitAndDeposit = async (user, amount) => {
      const nonce = 0;
      const expiry = Math.round(new Date().getTime() / 1000 + 3600);
      const erc20Name = await this.DAIMock.name();
      const sig =  await signPermit(this.DAIMock.address, erc20Name, user, this.batchedMint.address, nonce, expiry);
      const r = sig.slice(0, 66);
      const s = "0x" + sig.slice(66, 130);
      const v = "0x" + sig.slice(130, 132);

      // transfer amount from owner to user
      await this.DAIMock.transfer(user, amount, { from: owner });
      // call permitAndDeposit
      await this.batchedMint.permitAndDeposit(amount, nonce, expiry, v, r, s, { from: user });
    }

    const checkBalance = async (who, token, amount) => {
      (await token.balanceOf(who)).toString().should.be.equal(amount);
    }

    const checkUserDeposit = async (user, batch, amount) => {
      (await this.batchedMint.batchDeposits(user, batch)).toString().should.be.equal(amount);
    }

    const checkBatchTotal = async (batch, amount) => {
      const batchBalance = await this.batchedMint.batchTotals(batch);
      batchBalance.toString().should.be.equal(amount);
    }

    const withdraw = async (user, batch, expectedAmount) => {
      const initialBalance = await this.token.balanceOf(user);
      await this.batchedMint.withdraw(batch, { from: user });
      const balanceAfter = await this.token.balanceOf(user);
      balanceAfter.toString().should.be.equal(initialBalance.add(BNify(expectedAmount)).toString());
    }

    await checkBalance(this.batchedMint.address, this.token, "0");
    await checkBalance(this.batchedMint.address, this.DAIMock, "0");

    // 3 users deposit
    await deposit(user1, 10);
    await deposit(user2, 5);
    await deposit(user3, 6);

    // check deposit for each user
    await checkUserDeposit(user1, 0, "10");
    await checkUserDeposit(user2, 0, "5");
    await checkUserDeposit(user3, 0, "6");

    // check total deposit and contract tokens balance
    await checkBatchTotal(0, "21");
    await checkBalance(this.batchedMint.address, this.token, "0");
    await checkBalance(this.batchedMint.address, this.DAIMock, "21");

    // execute batch 0
    await this.batchedMint.executeBatch(true);

    // check contract tokens balance
    await checkBalance(this.batchedMint.address, this.token, "21");
    await checkBalance(this.batchedMint.address, this.DAIMock, "0");
    await checkBalance(user1, this.token, "0");

    // user1 withdraws batch 0
    await withdraw(user1, 0, "10");

    // check user balance and contract balance
    await checkBalance(user1, this.token, "10");
    await checkBalance(this.batchedMint.address, this.token, "11");

    // user2 permitAndDeposit
    await permitAndDeposit(user2, 30);
    await checkUserDeposit(user2, 0, "5");
    await checkUserDeposit(user2, 1, "30");

    // execute batch 1
    await this.batchedMint.executeBatch(true);

    // user2 has 0 idle tokens
    await checkBalance(user2, this.token, "0");
    // contract has 41 idle tokens
    await checkBalance(this.batchedMint.address, this.token, "41");

    // user2 withdraws batch 1
    await withdraw(user2, 1, "30");
    // user2 deposit for batch 0 is still 5
    await checkUserDeposit(user2, 0, "5");
    // user2 deposit for batch 1 is 0
    await checkUserDeposit(user2, 1, "0");
    // user2 has 30 idle tokens
    await checkBalance(user2, this.token, "30");
    // contract has 11 idle tokens
    await checkBalance(this.batchedMint.address, this.token, "11");
  });

  it("withdraws govTokens", async () => {
    const govTokens = [];
    govTokens[0] = await DAIMock.new({ from: owner });
    govTokens[1] = await DAIMock.new({ from: owner });
    govTokens[2] = await DAIMock.new({ from: owner });

    await this.token.setGovTokens([
      govTokens[0].address,
      govTokens[1].address,
      govTokens[2].address,
    ]);

    // move gov tokens to contract
    await govTokens[0].transfer(this.batchedMint.address, 10, { from: owner });
    await govTokens[1].transfer(this.batchedMint.address, 20, { from: owner });
    await govTokens[2].transfer(this.batchedMint.address, 30, { from: owner });

    const feeTreasury = "0x69a62C24F16d4914a48919613e8eE330641Bcb94";

    // feeTreasury has 0 of each gov token
    (await govTokens[0].balanceOf(feeTreasury)).toString().should.be.equal("0");
    (await govTokens[1].balanceOf(feeTreasury)).toString().should.be.equal("0");
    (await govTokens[2].balanceOf(feeTreasury)).toString().should.be.equal("0");

    // anyone can call withdrawGovToken and send them to feeTreasury
    await this.batchedMint.withdrawGovToken({ from: user4 });

    // feeTreasury received gov tokens
    (await govTokens[0].balanceOf(feeTreasury)).toString().should.be.equal("10");
    (await govTokens[1].balanceOf(feeTreasury)).toString().should.be.equal("20");
    (await govTokens[2].balanceOf(feeTreasury)).toString().should.be.equal("30");
  });
});
