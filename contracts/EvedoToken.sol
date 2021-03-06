pragma solidity 0.4.24;

import "./BurnableToken.sol";
import "./Ownable.sol";


/**
 * The Smart contract for Evedo Token. Based on OpenZeppelin: https://github.com/OpenZeppelin/openzeppelin-solidity
 */
contract EvedoToken is BurnableToken {

  string public name = "Evedo Token";
  string public symbol = "EVED";
  uint8 public decimals = 18;

  constructor(uint initialBalance) public {
    _mint(msg.sender, initialBalance);
  }
}
