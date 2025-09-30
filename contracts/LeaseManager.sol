// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {RentalRegistry} from "./RentalRegistry.sol";

contract LeaseManager is ReentrancyGuard {
    uint256 public constant PERIOD_SECONDS = 600;

    RentalRegistry public immutable registry;

    struct Lease {
        uint256 listingId;
        address tenant;
        address landlord;
        address token;
        uint256 rentPerPeriod;
        uint256 deposit;
        uint256 totalPeriods;
        uint256 paidPeriods;
        uint256 nextDue;
        bool active;
    }

    uint256 public nextLeaseId = 1;
    mapping(uint256 => Lease) public leases;

    event LeaseStarted(
        uint256 indexed leaseId,
        uint256 indexed listingId,
        address indexed tenant,
        address landlord,
        uint256 paidPeriods,
        uint256 nextDue
    );
    event RentPaid(uint256 indexed leaseId, uint256 periodIndex, uint256 amount, uint256 nextDue, bool closed);

    constructor(address registry_) {
        registry = RentalRegistry(registry_);
    }

    function joinLease(uint256 listingId) external nonReentrant returns (uint256 leaseId) {
        RentalRegistry.Listing memory L = registry.getListing(listingId);
        require(L.active, "listing inactive");
        require(L.availableFrom <= block.timestamp, "not available");

        uint256 upfront = L.deposit + L.rentPerPeriod;
        require(IERC20(L.payToken).transferFrom(msg.sender, L.landlord, upfront), "transferFrom failed");

        leaseId = nextLeaseId++;
        leases[leaseId] = Lease({
            listingId: listingId,
            tenant: msg.sender,
            landlord: L.landlord,
            token: L.payToken,
            rentPerPeriod: L.rentPerPeriod,
            deposit: L.deposit,
            totalPeriods: L.totalPeriods,
            paidPeriods: 1,
            nextDue: block.timestamp + PERIOD_SECONDS,
            active: true
        });

        emit LeaseStarted(leaseId, listingId, msg.sender, L.landlord, 1, block.timestamp + PERIOD_SECONDS);
    }

    function payRent(uint256 leaseId) public nonReentrant {
        Lease storage S = leases[leaseId];
        require(S.active, "inactive");
        require(S.paidPeriods < S.totalPeriods, "all paid");
        require(block.timestamp >= S.nextDue, "not due");

        require(IERC20(S.token).transferFrom(S.tenant, S.landlord, S.rentPerPeriod), "transferFrom failed");

        S.paidPeriods += 1;
        S.nextDue += PERIOD_SECONDS;

        bool closed = (S.paidPeriods == S.totalPeriods);
        if (closed) S.active = false;

        emit RentPaid(leaseId, S.paidPeriods, S.rentPerPeriod, S.nextDue, closed);
    }

    function dueNow(uint256 leaseId) external view returns (bool) {
        Lease memory S = leases[leaseId];
        return S.active && (S.paidPeriods < S.totalPeriods) && (block.timestamp >= S.nextDue);
    }
}
