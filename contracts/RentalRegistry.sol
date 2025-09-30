// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract RentalRegistry is Ownable {
    uint256 public constant PERIOD_SECONDS = 600;

    struct Listing {
        address landlord;
        address payToken;
        uint256 deposit;
        uint256 rentPerPeriod;
        uint256 totalPeriods;
        uint256 availableFrom;
        bool active;
    }

    uint256 public nextId = 1;
    mapping(uint256 => Listing) public listings;

    event ListingCreated(
        uint256 indexed id,
        address indexed landlord,
        address payToken,
        uint256 deposit,
        uint256 rentPerPeriod,
        uint256 totalPeriods,
        uint256 availableFrom
    );
    event ListingActiveSet(uint256 indexed id, bool active);

    constructor() Ownable(msg.sender) {}

    function createListing(
        address payToken,
        uint256 deposit,
        uint256 rentPerPeriod,
        uint256 totalPeriods,
        uint256 availableFrom
    ) external returns (uint256 id) {
        require(payToken != address(0), "payToken=0");
        require(totalPeriods > 0, "total=0");
        id = nextId++;
        listings[id] = Listing({
            landlord: msg.sender,
            payToken: payToken,
            deposit: deposit,
            rentPerPeriod: rentPerPeriod,
            totalPeriods: totalPeriods,
            availableFrom: availableFrom,
            active: true
        });
        emit ListingCreated(id, msg.sender, payToken, deposit, rentPerPeriod, totalPeriods, availableFrom);
    }

    function setActive(uint256 id, bool active_) external {
        Listing storage L = listings[id];
        require(L.landlord == msg.sender, "not landlord");
        L.active = active_;
        emit ListingActiveSet(id, active_);
    }

    function getListing(uint256 id) external view returns (Listing memory) {
        return listings[id];
    }
}
