import NFTContractArtifact from './abis/NFTContract.json';
import NFTStakingArtifact from './abis/NFTStaking.json';

// Sepolia Testnet — Deployed 2026-09-17
export const NFT_CONTRACT_ADDRESS = '0x0672637D709c44995bAB288FeF384eA745BFCC1E';
export const NFT_STAKING_ADDRESS = '0xbC096fff28cd00ab93419c4883Ff72A0fA699EDF';
export const REWARD_TOKEN_ADDRESS = '0x77D4Dd6149733845B0559f09fa798e07215d760C';

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
