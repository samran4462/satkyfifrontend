import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  rainbowWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { http, fallback } from 'viem';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [metaMaskWallet, coinbaseWallet, rainbowWallet],
    },
  ],
  {
    appName: 'Stakyfi',
    projectId: 'YOUR_PROJECT_ID', // WalletConnect not required for MetaMask
  }
);

export const config = createConfig({
  connectors,
  chains: [sepolia],
  transports: {
    [sepolia.id]: fallback([
      http('https://ethereum-sepolia-rpc.publicnode.com'),
      http('https://rpc.sepolia.org'),
      http('https://rpc2.sepolia.org'),
      http('https://sepolia.gateway.tenderly.co'),
    ]),
  },
  ssr: false,
});
