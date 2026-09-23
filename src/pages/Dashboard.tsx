import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Layers, Loader2, AlertCircle } from 'lucide-react';
import { StakeModal } from '../components/staking/StakeModal';
import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI } from '../config/contracts';

const TIERS = [
  { id: 1, name: 'Tier 1 (Bronze)', rate: '10 STAKY/day' },
  { id: 2, name: 'Tier 2 (Silver)', rate: '25 STAKY/day' },
  { id: 3, name: 'Tier 3 (Gold)', rate: '50 STAKY/day' },
  { id: 4, name: 'Tier 4 (Platinum)', rate: '100 STAKY/day' }
];

export function Dashboard() {
  const { address, isConnected } = useAccount();
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);

  // We query balanceOfBatch for Token IDs 1, 2, 3, 4
  const accounts = Array(4).fill(address || '0x0000000000000000000000000000000000000000');
  const ids = [1n, 2n, 3n, 4n];

  const { data: balances, isLoading, isError } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'balanceOfBatch',
    args: [accounts, ids],
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 10000, // Refresh every 10s
    },
  });

  const parsedBalances = balances ? (balances as unknown[]).map(b => Number(b)) : [0, 0, 0, 0];
  const hasAnyBalance = parsedBalances.some(b => b > 0);

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mx-auto mb-6 text-foreground/50">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Wallet Not Connected</h2>
          <p className="text-foreground/70">Please connect your wallet using the button in the navigation bar to view your NFTs and start staking.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">My Holdings</h1>
          <p className="text-foreground/70 mt-2">Manage and stake your Stakyfi NFTs</p>
        </div>
        
        <button 
          onClick={() => setIsStakeModalOpen(true)}
          disabled={!hasAnyBalance}
          className="px-6 py-3 rounded-xl bg-electric text-black font-bold shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all hover:bg-bright-violet disabled:opacity-50 disabled:shadow-none disabled:hover:bg-electric"
        >
          Batch Stake NFTs
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-foreground/50">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-electric" />
          <p>Loading your NFT balances...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-400 bg-red-500/5 rounded-2xl border border-red-500/10">
          <AlertCircle className="w-10 h-10 mb-4" />
          <p>Failed to load balances. Please check your network connection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tier, index) => {
            const balance = parsedBalances[index];
            const hasBalance = balance > 0;
            
            return (
              <div 
                key={tier.id}
                className={`p-6 rounded-2xl border transition-all ${
                  hasBalance 
                    ? 'bg-surface-elevated border-electric/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' 
                    : 'bg-surface border-surface-elevated opacity-60'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasBalance ? 'bg-electric/20 text-electric' : 'bg-surface-elevated text-foreground/50'}`}>
                    <Layers className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-navy text-cyan border border-cyan/20">
                    ID #{tier.id}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1">{tier.name}</h3>
                <div className="text-sm text-foreground/70 mb-6 flex justify-between">
                  <span>Base Rate:</span>
                  <span className="text-cyan">{tier.rate}</span>
                </div>
                
                <div className="pt-4 border-t border-surface-elevated flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-foreground/50">Owned</span>
                    <span className="text-xl font-bold text-white">{balance}</span>
                  </div>
                  
                  <button 
                    onClick={() => setIsStakeModalOpen(true)}
                    disabled={!hasBalance}
                    className="px-4 py-2 rounded-lg bg-electric text-black text-sm font-bold shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all hover:bg-bright-violet disabled:opacity-50 disabled:shadow-none disabled:hover:bg-electric"
                  >
                    Stake
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StakeModal 
        isOpen={isStakeModalOpen}
        onClose={() => setIsStakeModalOpen(false)}
        balances={parsedBalances}
      />
    </div>
  );
}
