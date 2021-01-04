// SPDX-License-Identifier: Apache-2.0
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC20Permit is IERC20 {
  function permit(address holder, address spender, uint256 nonce, uint256 expiry,
                  bool allowed, uint8 v, bytes32 r, bytes32 s) external;

  function nonces(address holder) external view returns(uint);
  function name() external view returns(string memory);
}
