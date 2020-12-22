pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DAIMock is ERC20 {
  constructor()
    ERC20('DAI', 'DAI') public {
    _mint(address(this), 10**24); // 1.000.000 DAI
    _mint(msg.sender, 10**21); // 1.000 DAI
  }
}
