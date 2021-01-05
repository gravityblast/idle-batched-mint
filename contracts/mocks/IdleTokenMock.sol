pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract IdleTokenMock is ERC20 {
  using SafeERC20 for IERC20;

  address public underlying;
  address[] public govTokens;

  constructor(address _underlying)
    ERC20('IDLEDAI', 'IDLEDAI') public {
      underlying = _underlying;
  }

  function setGovTokens(address[] memory _govTokens) external {
    govTokens = _govTokens;
  }

  function getGovTokensAmounts(address _usr) external view returns (uint256[] memory) {
    return new uint256[](govTokens.length);
  }

  function token() public view returns(address) {
    return underlying;
  }

  function mintIdleToken(uint256 _amount, bool _skipRebalance, address _referral) external returns(uint256) {
    IERC20(underlying).safeTransferFrom(msg.sender, address(this), _amount);
    _mint(msg.sender, _amount);
    return _amount;
  }
}
