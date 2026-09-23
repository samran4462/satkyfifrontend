import NFTContractArtifact from './abis/NFTContract.json';
import NFTStakingArtifact from './abis/NFTStaking.json';

// Sepolia Testnet — Deployed 2026-09-17
export const NFT_CONTRACT_ADDRESS = '0x616D4398d8a317411a9BfB29Ad77BBD5d94D863d';
export const NFT_STAKING_ADDRESS = '0x308817A59f881c1B94ab4a6284521C0018bD3e50';
export const REWARD_TOKEN_ADDRESS = '0xe74773D89650346293e09f607A8cCfcD2f4c4eab';

export const NFT_CONTRACT_ABI = NFTContractArtifact.abi;
export const NFT_STAKING_ABI = NFTStakingArtifact.abi;

export const PUBLIC_MINTER_ADDRESS = '0xD9c83c70F4937e8B1D9895eBED2b4d8F22971F09';

export const PUBLIC_MINTER_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
