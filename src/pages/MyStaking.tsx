import { useMemo, useState, useEffect } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { Layers, Loader2, AlertCircle, Clock, Lock, Unlock, Trophy, Activity, Coins } from 'lucide-react';
import { formatEther } from 'viem';
import { NFT_STAKING_ADDRESS, NFT_STAKING_ABI } from '../config/contracts';
import { UnstakeModal } from '../components/staking/UnstakeModal';

const TIER_NAMES: Record<number, string> = {
  1: 'Tier 1 (Bronze)',
  2: 'Tier 2 (Silver)',
  3: 'Tier 3 (Gold)',
  4: 'Tier 4 (Platinum)',
};

export interface PositionData {
  positionId: number;
  tokenId: number;
  amount: number;
  startTime: number;
  pendingRewards: bigint;
  isLocked: boolean;
}

function Timer({ startTime, lockDuration }: { startTime: number, lockDuration: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => {
      setElapsed(Math.floor(Date.now() / 1000) - startTime);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const remaining = Math.max(0, lockDuration - elapsed);

  if (remaining === 0) {
    return <span className="text-green-400 font-bold">Unlocked</span>;
  }

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);

  if (days > 0) return <span>{days}d {hours}h {mins}m left</span>;
  if (hours > 0) return <span>{hours}h {mins}m left</span>;
  return <span>{mins}m left</span>;
}

export function MyStaking() {
  const { address, isConnected } = useAccount();
  const [unstakePositions, setUnstakePositions] = useState<PositionData[] | null>(null);

  // 1. Fetch Global Settings
  const { data: globalData, isLoading: isGlobalLoading } = useReadContracts({
    contracts: [
      { address: NFT_STAKING_ADDRESS, abi: NFT_STAKING_ABI, functionName: 'lockDuration' },
      { address: NFT_STAKING_ADDRESS, abi: NFT_STAKING_ABI, functionName: 'penaltyBps' }
    ]
  });

  const lockDuration = globalData?.[0]?.result ? Number(globalData[0].result) : 30 * 86400;
  const penaltyBps = globalData?.[1]?.result ? Number(globalData[1].result) : 0;

  // 2. Fetch user's position IDs
  const { 
    data: positionIds, 
    isLoading: isIdsLoading, 
    isError: isIdsError 
  } = useReadContract({
    address: NFT_STAKING_ADDRESS,
    abi: NFT_STAKING_ABI,
    functionName: 'getUserPositions',
    args: [address as `0x${string}`],
    query: {
      enabled: isConnected && !!address,
    },
  });

  const parsedPositionIds = (positionIds as unknown[] || []).map(id => BigInt(id as any));

  // 3. Prepare multicall configuration for positions and rewards
  const contracts = useMemo(() => {
    if (!parsedPositionIds.length) return [];
    
    const calls: any[] = [];
    parsedPositionIds.forEach(id => {
      calls.push({
        address: NFT_STAKING_ADDRESS,
        abi: NFT_STAKING_ABI,
        functionName: 'positions',
        args: [id],
      });
      calls.push({
        address: NFT_STAKING_ADDRESS,
        abi: NFT_STAKING_ABI,
        functionName: 'pendingRewards',
        args: [id],
      });
    });
    return calls;
  }, [parsedPositionIds]);

  // 4. Execute multicall
  const { 
    data: multicallData, 
    isLoading: isMulticallLoading 
  } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
      refetchInterval: 12000, 
    }
  });

  // 5. Parse Multicall Results
  const positions = useMemo(() => {
    if (!multicallData || !parsedPositionIds.length) return [];
    
    const parsed: PositionData[] = [];
    for (let i = 0; i < parsedPositionIds.length; i++) {
      const positionStructData = multicallData[i * 2];
      const pendingRewardsData = multicallData[i * 2 + 1];

      if (positionStructData.status === 'success' && pendingRewardsData.status === 'success') {
        const struct = positionStructData.result as any[];
        // Filter out burnt positions if amount == 0, though contract might delete them
        if (Number(struct[2]) > 0) {
          const startTime = Number(struct[3]);
          parsed.push({
            positionId: Number(struct[0]),
            tokenId: Number(struct[1]),
            amount: Number(struct[2]),
            startTime: startTime,
            pendingRewards: pendingRewardsData.result as bigint,
            isLocked: (Math.floor(Date.now() / 1000) - startTime) < lockDuration,
          });
        }
      }
    }
    return parsed;
  }, [multicallData, parsedPositionIds, lockDuration]);

  const totalStakedNFTs = positions.reduce((acc, pos) => acc + pos.amount, 0);
  const totalPendingRewards = positions.reduce((acc, pos) => acc + pos.pendingRewards, 0n);

  const isLoading = isIdsLoading || isMulticallLoading || isGlobalLoading;

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mx-auto mb-6 text-foreground/50">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Wallet Not Connected</h2>
          <p className="text-foreground/70">Connect your wallet to view your active staking positions and claim rewards.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">My Staking Dashboard</h1>
          <p className="text-foreground/70 mt-2">Track your active positions, monitor multipliers, and view live pending rewards.</p>
        </div>
        
        <button 
          onClick={() => setUnstakePositions(positions)}
          disabled={positions.length === 0}
          className="px-6 py-3 rounded-xl bg-surface-elevated text-white font-bold border border-surface transition-all hover:bg-navy disabled:opacity-50 disabled:hover:bg-surface-elevated"
        >
          Batch Unstake All
        </button>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="p-6 rounded-2xl border border-electric/30 bg-electric/10 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-electric/20 rounded-full blur-[40px]" />
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-lg bg-electric/20 flex items-center justify-center text-electric">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Total Staked NFTs</h3>
          </div>
          <p className="text-4xl font-extrabold text-white pl-14">
            {isLoading ? <span className="animate-pulse bg-surface h-10 w-24 rounded inline-block" /> : totalStakedNFTs}
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-cyan/30 bg-cyan/10 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-cyan/20 rounded-full blur-[40px]" />
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-lg bg-cyan/20 flex items-center justify-center text-cyan">
              <Coins className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Total Pending Rewards</h3>
          </div>
          <p className="text-4xl font-extrabold text-white pl-14 flex items-end gap-2">
            {isLoading ? (
              <span className="animate-pulse bg-surface h-10 w-48 rounded inline-block" />
            ) : (
              <>
                {Number(formatEther(totalPendingRewards)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                <span className="text-lg text-cyan/80 font-bold mb-1">AURA</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Positions List */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-electric" />
          <h2 className="text-xl font-bold text-white">Active Positions</h2>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground/50 border border-surface-elevated rounded-2xl bg-surface">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-electric" />
            <p>Loading your staking positions...</p>
          </div>
        ) : isIdsError ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-400 bg-red-500/5 rounded-2xl border border-red-500/10">
            <AlertCircle className="w-10 h-10 mb-4" />
            <p>Failed to fetch positions. Please check your network connection.</p>
          </div>
        ) : positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground/50 border border-surface-elevated rounded-2xl bg-surface-elevated/30">
            <Trophy className="w-12 h-12 mb-4 text-surface-elevated" />
            <p className="text-lg">No active staking positions found.</p>
            <p className="text-sm">Head over to the Explore NFTs tab to start staking.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {positions.map((pos) => (
              <div key={pos.positionId} className="p-6 rounded-2xl border border-surface-elevated bg-surface-elevated/20 transition-all hover:bg-surface-elevated/40 hover:border-electric/30">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-surface-elevated shrink-0 shadow-lg">
                      <img src={`/assets/tiers/${pos.tokenId}.jpg`} alt={`Tier ${pos.tokenId}`} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider block mb-1">
                        Position #{pos.positionId}
                      </span>
                      <h3 className="text-lg font-bold text-white">{TIER_NAMES[pos.tokenId] || `Tier ? (ID: ${pos.tokenId})`}</h3>
                    </div>
                  </div>
                  
                  {pos.isLocked ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                      <Lock className="w-3.5 h-3.5" /> Early Penalty Active
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                      <Unlock className="w-3.5 h-3.5" /> Fully Unlocked
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-surface border border-surface-elevated">
                    <span className="text-xs text-foreground/50 block mb-1">Staked Amount</span>
                    <span className="text-xl font-bold text-white">{pos.amount} NFTs</span>
                  </div>
                  <div className="p-4 rounded-xl bg-surface border border-surface-elevated">
                    <span className="text-xs text-foreground/50 block mb-1">Lock Timer</span>
                    <span className="text-xl font-bold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-electric" /> 
                      <Timer startTime={pos.startTime} lockDuration={lockDuration} />
                    </span>
                  </div>
                </div>

                <div className="pt-6 border-t border-surface-elevated flex items-end justify-between">
                  <div>
                    <span className="text-xs text-foreground/50 block mb-1">Live Pending Rewards</span>
                    <div className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-electric to-cyan">
                      {Number(formatEther(pos.pendingRewards)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} AURA
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setUnstakePositions([pos])}
                    className="px-5 py-2.5 rounded-lg bg-surface border border-surface-elevated text-white text-sm font-bold transition-all hover:bg-electric hover:text-black hover:border-electric shadow-sm hover:shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                  >
                    Unstake
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <UnstakeModal 
        isOpen={!!unstakePositions}
        onClose={() => setUnstakePositions(null)}
        positions={unstakePositions || []}
        lockDuration={lockDuration}
        penaltyBps={penaltyBps}
      />
    </div>
  );
}
