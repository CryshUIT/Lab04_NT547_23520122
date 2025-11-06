// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MyNFT is ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    uint256 public mintFee = 0.01 ether;
    uint256 public constant MAX_SUPPLY = 100;
    mapping(uint256 => string) private _tokenURIs;

    constructor() ERC721("MyNFTCollection", "MNC") Ownable(msg.sender) {}

    // Mint NFT có phí và giới hạn
    function safeMint(address to, string memory uri) public payable {
        require(msg.value >= mintFee, "Insufficient mint fee");
        require(_tokenIds.current() < MAX_SUPPLY, "Max supply reached");

        uint256 tokenId = _tokenIds.current();
        _tokenIds.increment();

        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = uri;
    }

    // Rút tiền
    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Trả về metadata URI
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    // --- Các override cần thiết cho ERC721Enumerable (OZ v5) ---
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }
}
