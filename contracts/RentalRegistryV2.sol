// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILeaseManagerConsumed {
    function consumed(uint256 listingId) external view returns (bool);
}

contract RentalRegistryV2 {
    struct Listing {
        address landlord;
        address payToken;
        uint256 deposit;
        uint256 rentPerPeriod;
        uint256 totalPeriods;
        uint256 availableFrom;
        string  metadataURI;
    }

    mapping(uint256 => Listing) public listings;
    uint256 public nextListingId;

    // Manager 주소(소비 여부 체크용)
    address public manager;
    address public owner;

    event ListingCreated(uint256 indexed id, address indexed landlord, string metadataURI);
    event ListingCancelled(uint256 indexed id, address indexed landlord);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setManager(address _manager) external onlyOwner {
        manager = _manager;
    }

    function createListing(
        address token,
        uint256 deposit,
        uint256 rentPerPeriod,
        uint256 totalPeriods,
        uint256 availableFrom,
        string calldata metadataURI
    ) external returns (uint256 id) {
        id = ++nextListingId;
        listings[id] = Listing({
            landlord: msg.sender,
            payToken: token,
            deposit: deposit,
            rentPerPeriod: rentPerPeriod,
            totalPeriods: totalPeriods,
            availableFrom: availableFrom,
            metadataURI: metadataURI
        });
        emit ListingCreated(id, msg.sender, metadataURI);
    }

    function cancelListing(uint256 id) external {
        Listing storage L = listings[id];
        require(L.landlord != address(0), "no listing");
        require(msg.sender == L.landlord, "not landlord");
        require(manager != address(0), "manager not set");
        require(!ILeaseManagerConsumed(manager).consumed(id), "already joined");

        delete listings[id];
        emit ListingCancelled(id, msg.sender);
    }

    // manager에서 한 번에 읽기 편하게 뷰 제공
    function getListing(uint256 id) external view returns(
        address landlord, address token, uint256 deposit, uint256 rentPer,
        uint256 total, uint256 availableFrom, string memory uri
    ){
        Listing storage L = listings[id];
        return (L.landlord, L.payToken, L.deposit, L.rentPerPeriod, L.totalPeriods, L.availableFrom, L.metadataURI);
    }
}
