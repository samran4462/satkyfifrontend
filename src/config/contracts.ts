import NFTContractArtifact from './abis/NFTContract.json';
import NFTStakingArtifact from './abis/NFTStaking.json';

// Sepolia Testnet — Deployed 2026-09-17
export const NFT_CONTRACT_ADDRESS = '0xa9ED3f441Ba9e50a187e1498E54e7a1362ec2772';
export const NFT_STAKING_ADDRESS = '0xAf84634D41508cC84659d177F0Fd38547B76C006';
export const REWARD_TOKEN_ADDRESS = '0xcD6e413F8Dec4cd8919412E11B1db905bE89fB61';

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
