// src/App.js
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import Swal from "sweetalert2";
import MyNFT_ABI from "./utils/MyNFT.json";
import "./App.css";

const contractAddress = "0x8806fC7258C69bB9E4b6308512C41120D6C03c1d"; 
const defaultMetadataURI = "https://gateway.pinata.cloud/ipfs/bafkreiabfkkxx65xfolajisyu77hblftglhikhajj63yp3ordl5rliivp4";

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [mintFee, setMintFee] = useState(null);
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [nftData, setNftData] = useState(null);
  const [ownedNFTs, setOwnedNFTs] = useState([]);
  const [metadataURI, setMetadataURI] = useState(defaultMetadataURI);

  async function connectWallet() {
    if (!window.ethereum) {
      Swal.fire({
        icon: "warning",
        title: "Chưa cài MetaMask!",
        text: "Vui lòng cài đặt MetaMask để sử dụng DApp.",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];
      setWalletAddress(address);

      const nftContract = new ethers.Contract(contractAddress, MyNFT_ABI, provider);
      const fee = await nftContract.mintFee();
      setMintFee(ethers.utils.formatEther(fee));

      Swal.fire({
        icon: "success",
        title: "Kết nối thành công!",
        text: `Địa chỉ ví: ${address}`,
        confirmButtonColor: "#4f46e5",
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Lỗi khi kết nối MetaMask",
        text: "Vui lòng thử lại.",
        confirmButtonColor: "#4f46e5",
      });
    }
  }

  async function mintNFT() {
    if (!walletAddress)
      return Swal.fire({
        icon: "info",
        title: "Chưa kết nối ví",
        text: "Vui lòng kết nối MetaMask trước khi mint NFT.",
        confirmButtonColor: "#4f46e5",
      });

    if (!metadataURI)
      return Swal.fire({
        icon: "warning",
        title: "Thiếu Metadata URI",
        text: "Hãy nhập đường dẫn metadata trước khi mint!",
        confirmButtonColor: "#4f46e5",
      });

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const nftContract = new ethers.Contract(contractAddress, MyNFT_ABI, signer);

    try {
      const fee = ethers.utils.parseEther(mintFee || "0.01");
      setStatus("Đang gửi giao dịch mint...");

      const tx = await nftContract.safeMint(walletAddress, metadataURI, {
        value: fee,
      });

      setTxHash(tx.hash);
      setStatus("Đang chờ xác nhận giao dịch...");
      await tx.wait();

      Swal.fire({
        icon: "success",
        title: "Mint thành công!",
        html: `Giao dịch của bạn đã hoàn tất.<br><a href="https://sepolia.etherscan.io/tx/${tx.hash}" target="_blank">Xem trên Etherscan</a>`,
        confirmButtonColor: "#4f46e5",
      });

      setStatus("Mint thành công!");
      await loadMyCollection();
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Mint thất bại!",
        text: error?.message || "Có lỗi xảy ra khi gửi giao dịch.",
        confirmButtonColor: "#4f46e5",
      });
      setStatus("Mint thất bại: " + (error?.message || error));
    }
  }

  async function viewNFT() {
    if (!tokenId)
      return Swal.fire({
        icon: "info",
        title: "Thiếu Token ID",
        text: "Vui lòng nhập tokenId trước khi tra cứu.",
        confirmButtonColor: "#4f46e5",
      });

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const nftContract = new ethers.Contract(contractAddress, MyNFT_ABI, provider);

      const uri = await nftContract.tokenURI(tokenId);
      const fetchUrl = uri.startsWith("ipfs://")
        ? uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")
        : uri;

      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error("Không thể tải metadata!");
      const data = await res.json();
      setNftData({ tokenId, ...data });

      Swal.fire({
        icon: "success",
        title: "Đã tải thông tin NFT!",
        text: `Token ID #${tokenId}`,
        confirmButtonColor: "#4f46e5",
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Không tìm thấy NFT",
        text: "TokenId này không tồn tại hoặc metadata không hợp lệ!",
        confirmButtonColor: "#4f46e5",
      });
    }
  }

  async function loadMyCollection() {
    if (!walletAddress)
      return Swal.fire({
        icon: "info",
        title: "Chưa kết nối ví",
        text: "Vui lòng kết nối MetaMask trước khi tải bộ sưu tập.",
        confirmButtonColor: "#4f46e5",
      });

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const nftContract = new ethers.Contract(contractAddress, MyNFT_ABI, provider);

      const balanceBN = await nftContract.balanceOf(walletAddress);
      const balance = balanceBN.toNumber();

      if (balance === 0) {
        setOwnedNFTs([]);
        Swal.fire({
          icon: "info",
          title: "Không có NFT nào",
          text: "Ví hiện không sở hữu NFT nào.",
          confirmButtonColor: "#4f46e5",
        });
        return;
      }

      const tokenIds = await Promise.all(
        [...Array(balance)].map((_, i) =>
          nftContract.tokenOfOwnerByIndex(walletAddress, i)
        )
      );

      const tokens = await Promise.all(
        tokenIds.map(async (idBN) => {
          const id = idBN.toString();
          const uri = await nftContract.tokenURI(id);
          const fetchUrl = uri.startsWith("ipfs://")
            ? uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")
            : uri;

          try {
            const res = await fetch(fetchUrl);
            const meta = await res.json();
            return { id, ...meta };
          } catch {
            return { id, name: `NFT #${id}`, image: "", description: "Metadata lỗi" };
          }
        })
      );

      setOwnedNFTs(tokens);

      Swal.fire({
        icon: "success",
        title: "Bộ sưu tập đã tải!",
        text: `Bạn đang sở hữu ${tokens.length} NFT.`,
        confirmButtonColor: "#4f46e5",
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Lỗi khi tải bộ sưu tập",
        text: "Không thể lấy dữ liệu NFT của ví!",
        confirmButtonColor: "#4f46e5",
      });
    }
  }

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => window.location.reload());
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎨 My NFT DApp</h1>

        {}
        <button onClick={connectWallet} className="connect-button">
          {walletAddress
            ? `Ví: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
            : "Kết nối MetaMask"}
        </button>

        {}
        {mintFee && <p className="info-text">Phí Mint hiện tại: {mintFee} ETH</p>}

        {}
        <div className="mint-container">
          <h3>Mint NFT mới</h3>
          <input
            type="text"
            className="input-text"
            placeholder="Nhập Metadata URI..."
            value={metadataURI}
            onChange={(e) => setMetadataURI(e.target.value)}
          />
          <button onClick={mintNFT} className="mint-button">
            Mint NFT (trả {mintFee || "0.01"} ETH)
          </button>
          {status && <p className="status-text">{status}</p>}
        </div>

        {}
        <div className="lookup-section">
          <h3>Xem NFT theo Token ID</h3>
          <input
            type="number"
            placeholder="Nhập tokenId..."
            className="input-text"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
          />
          <button onClick={viewNFT} className="lookup-button">
            Tra cứu
          </button>

          {nftData && (
            <div className="nft-info">
              <h4>
                {nftData.name || `NFT #${nftData.tokenId}`} (ID: {nftData.tokenId})
              </h4>
              <p>{nftData.description}</p>
              {nftData.image && (
                <img
                  src={nftData.image.replace(
                    "ipfs://",
                    "https://gateway.pinata.cloud/ipfs/"
                  )}
                  alt="NFT"
                  width="200"
                />
              )}
            </div>
          )}
        </div>

        {}
        <div className="collection-section">
          <h3>Bộ sưu tập của bạn</h3>
          <button onClick={loadMyCollection} className="refresh-button">
            Tải bộ sưu tập
          </button>
          <div className="collection-grid">
            {ownedNFTs.length === 0 ? (
              <p>Không có NFT nào để hiển thị.</p>
            ) : (
              ownedNFTs.map((nft) => (
                <div key={nft.id} className="nft-card">
                  {nft.image ? (
                    <img
                      src={nft.image.replace(
                        "ipfs://",
                        "https://gateway.pinata.cloud/ipfs/"
                      )}
                      alt={nft.name}
                      width="150"
                    />
                  ) : (
                    <div className="placeholder">No Image</div>
                  )}
                  <p>
                    #{nft.id} — {nft.name}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
