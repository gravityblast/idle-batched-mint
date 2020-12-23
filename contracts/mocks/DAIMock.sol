pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DAIMock is ERC20 {
  bytes32 public DOMAIN_SEPARATOR;
  // bytes32 public constant PERMIT_TYPEHASH = keccak256("Permit(address holder,address spender,uint256 nonce,uint256 expiry,bool allowed)");
  bytes32 public constant PERMIT_TYPEHASH = 0xea2aa0a1be11a07ed86d755c93467f4f82362b452371d1ba94d1715123511acb;
  string  public constant _name     = "Dai Stablecoin";
  string  public constant _symbol   = "DAI";
  string  public constant _version  = "1";

  mapping (address => uint) public nonces;

  constructor()
    ERC20(_name, _symbol) public {
    DOMAIN_SEPARATOR = keccak256(abi.encode(
          keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
          keccak256(bytes(_name)),
          keccak256(bytes(_version)),
          getChainID(),
          address(this)
      ));
    _mint(address(this), 10**24); // 1.000.000 DAI
    _mint(msg.sender, 10**21); // 1.000 DAI
  }

  function getChainID() internal pure returns (uint256) {
    uint256 id;
    assembly {
      id := chainid()
    }

    return id;
  }

  function permit(address holder, address spender, uint256 nonce, uint256 expiry,
                  bool allowed, uint8 v, bytes32 r, bytes32 s) external
  {
      bytes32 digest =
          keccak256(abi.encodePacked(
              "\x19\x01",
              DOMAIN_SEPARATOR,
              keccak256(abi.encode(PERMIT_TYPEHASH,
                                   holder,
                                   spender,
                                   nonce,
                                   expiry,
                                   allowed))
      ));

      require(holder != address(0), "dai/invalid-address-0");
      require(holder == ecrecover(digest, v, r, s), "dai/invalid-permit");
      require(expiry == 0 || now <= expiry, "dai/permit-expired");
      require(nonce == nonces[holder]++, "dai/invalid-nonce");
      uint wad = allowed ? uint(-1) : 0;
      _approve(holder, spender, wad);
      emit Approval(holder, spender, wad);
  }
}
