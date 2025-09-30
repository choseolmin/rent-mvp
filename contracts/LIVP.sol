// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract LIVP is ERC20, ERC20Permit, Ownable {
    constructor() ERC20("LIVPOINT", "LIVP") ERC20Permit("LIVPOINT") Ownable(msg.sender) {
        _mint(msg.sender, 100_000 * 1e18);
    }
}
