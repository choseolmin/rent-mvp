// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RentalRegistryV2.sol";       
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LeaseManagerV2 {
    RentalRegistryV2 public immutable registry;

    // listing이 조인(소비)되었는지 표시
    mapping(uint256 => bool) public consumed;

    struct Lease {
        address tenant;
        address landlord;
        IERC20  token;
        uint256 rentPerPeriod;
        uint256 nextDue;
        uint256 paidPeriods;
        uint256 totalPeriods;
        bool    active;
    }
    mapping(uint256 => Lease) public leases;
    uint256 public nextLeaseId;

    event LeaseStarted(uint256 indexed leaseId, uint256 indexed listingId, address indexed tenant, address landlord);
    event RentPaid(uint256 indexed leaseId, uint256 period, uint256 amount);
    event LeaseClosed(uint256 indexed leaseId);

    constructor(address _registry) {
        registry = RentalRegistryV2(_registry);
    }

    function joinLease(uint256 listingId) external {
        require(!consumed[listingId], "listing already consumed");

        // 레지스트리에서 listing 정보 읽기
        (address landlord, address tokenAddr, uint256 deposit, uint256 rentPer,
         uint256 total, uint256 availableFrom, /*string memory uri*/) = registry.getListing(listingId);

        require(landlord != address(0), "no listing");
        require(block.timestamp >= availableFrom, "not available");

        IERC20 token = IERC20(tokenAddr);

        // 보증금 + 1회차 즉시 전송
        uint256 upfront = deposit + rentPer;
        require(token.transferFrom(msg.sender, landlord, upfront), "transfer failed");

        // lease 기록
        uint256 id = ++nextLeaseId;
        leases[id] = Lease({
            tenant: msg.sender,
            landlord: landlord,
            token: token,
            rentPerPeriod: rentPer,
            nextDue: block.timestamp + 600,      // 10분 주기(이미 온체인 고정)
            paidPeriods: 1,
            totalPeriods: total,
            active: true
        });

        // ★ 조인된 listingId를 소비 처리
        consumed[listingId] = true;

        emit LeaseStarted(id, listingId, msg.sender, landlord);
    }

    function dueNow(uint256 leaseId) public view returns (bool) {
        Lease storage L = leases[leaseId];
        return L.active && L.paidPeriods < L.totalPeriods && block.timestamp >= L.nextDue;
    }

    function payRent(uint256 leaseId) external {
        Lease storage L = leases[leaseId];
        require(L.active, "inactive");
        require(dueNow(leaseId), "not due");

        require(L.token.transferFrom(L.tenant, L.landlord, L.rentPerPeriod), "transfer failed");

        L.paidPeriods += 1;
        L.nextDue = block.timestamp + 600;

        emit RentPaid(leaseId, L.paidPeriods, L.rentPerPeriod);

        if (L.paidPeriods >= L.totalPeriods) {
            L.active = false;
            emit LeaseClosed(leaseId);
        }
    }
}
