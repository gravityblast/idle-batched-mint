// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interfaces/IIdleTokenV3_1.sol";
import "./interfaces/IERC20Permit.sol";

// import "hardhat/console.sol";

contract IdleBatchedMint is Initializable, OwnableUpgradeable, PausableUpgradeable {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  address constant feeTreasury = 0x69a62C24F16d4914a48919613e8eE330641Bcb94;
  address constant ecosystemFund = 0xb0aA1f98523Ec15932dd5fAAC5d86e57115571C7;

  // batchDeposits[user][batchId] = amount
  mapping (address => mapping (uint256 => uint256)) public batchDeposits;
  mapping (uint256 => uint256) public batchTotals;
  mapping (uint256 => uint256) public batchRedeemedTotals;
  uint256 public currBatch;
  address public idleToken;
  address public underlying;

  function initialize(address _idleToken) public initializer {
    OwnableUpgradeable.__Ownable_init();
    PausableUpgradeable.__Pausable_init();
    idleToken = _idleToken;
    underlying = IIdleTokenV3_1(idleToken).token();
    IERC20(underlying).safeApprove(idleToken, uint256(-1));
  }

  // User should approve this contract first to spend IdleTokens idleToken
  function deposit(uint256 amount) public whenNotPaused {
    IERC20(underlying).safeTransferFrom(msg.sender, address(this), amount);
    batchDeposits[msg.sender][currBatch] = batchDeposits[msg.sender][currBatch].add(amount);
    batchTotals[currBatch] = batchTotals[currBatch].add(amount);
  }

  function permitAndDeposit(uint256 amount, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external whenNotPaused {
    IERC20Permit(underlying).permit(msg.sender, address(this), nonce, expiry, true, v, r, s);
    deposit(amount);
  }

  function permitEIP2612AndDeposit(uint256 amount, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external whenNotPaused {
    IERC20Permit(underlying).permit(msg.sender, address(this), amount, expiry, v, r, s);
    deposit(amount);
  }

  function withdraw(uint256 batchId) external whenNotPaused {
    require(currBatch != 0 && batchId < currBatch, 'Batch id invalid');
    require(batchTotals[batchId] > 0, "empty batch");

    uint256 deposited = batchDeposits[msg.sender][batchId];
    uint256 batchBal = batchRedeemedTotals[batchId];
    uint256 share = deposited.mul(batchBal).div(batchTotals[batchId]);
    if (share > batchBal) {
      share = batchBal;
    }
    batchRedeemedTotals[batchId] = batchBal.sub(share);
    batchTotals[batchId] = batchTotals[batchId].sub(deposited);
    batchDeposits[msg.sender][batchId] = 0;
    IERC20(idleToken).safeTransfer(msg.sender, share);
  }

  function executeBatch(bool _skipRebalance) external whenNotPaused returns (uint256) {
    uint256 minted = IIdleTokenV3_1(idleToken).mintIdleToken(
      batchTotals[currBatch], _skipRebalance, address(0)
    );
    batchRedeemedTotals[currBatch] = minted;
    currBatch = currBatch.add(1);
  }

  function withdrawGovToken() external whenNotPaused {
    uint256[] memory amounts = IIdleTokenV3_1(idleToken).getGovTokensAmounts(0x0000000000000000000000000000000000000000);

    for (uint256 i = 0; i < amounts.length; i++) {
      address token = IIdleTokenV3_1(idleToken).govTokens(i);
      IERC20(token).safeTransfer(feeTreasury, IERC20(token).balanceOf(address(this)));
    }
  }

  function emergencyWithdrawToken(address _token, address _to) external onlyOwner {
    if (_token == underlying || _token == idleToken) {
      require(_to == feeTreasury || _to == ecosystemFund, "recipient must be feeTreasury or ecosystemFund");
    }
    IERC20(_token).safeTransfer(_to, IERC20(_token).balanceOf(address(this)));
  }

  function pause() external {
    _pause();
  }
}
