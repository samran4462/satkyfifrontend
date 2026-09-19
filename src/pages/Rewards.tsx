import { useMemo, useEffect } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Coins, Trophy, Activity, AlertCircle, Loader2, CheckCircle2, Star, TrendingUp } from 'lucide-react';
import { formatEther } from 'viem';
import { NFT_STAKING_ADDRESS, NFT_STAKING_ABI } from '../config/contracts';

const TIER_NAMES: Record<number, string> = {
  1: 'Tier 1 (Bronze)',
  2: 'Tier 2 (Silver)',
  3: 'Tier 3 (Gold)',
  4: 'Tier 4 (Platinum)',
};

const STAKY_TOKEN_ADDRESS = '0xcD6e413F8Dec4cd8919412E11B1db905bE89fB61' as `0x${string}`;
const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] }
] as const;

export function Rewards() {
  const { address, isConnected } = useAccount();

  // 1. Fetch Global Stats
  const { data: globalData, isLoading: isGlobalLoading } = useReadContracts({
    contracts: [
      { address: NFT_STAKING_ADDRESS, abi: NFT_STAKING_ABI, functionName: 'availableBalance' },
      { address: NFT_STAKING_ADDRESS, abi: NFT_STAKING_ABI, functionName: 'totalClaimed' },
    ],
    query: {
      refetchInterval: 12000,
    }
  });

  const availablePoolBalance = globalData?.[0]?.result as bigint || 0n;
  const globalTotalClaimed = globalData?.[1]?.result as bigint || 0n;

  // 1b. Fetch User STAKY Balance
  const { data: stakyData, refetch: refetchStaky } = useReadContract({
    address: STAKY_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { enabled: !!address }
  });
  const stakyBalance = Number(formatEther((stakyData as bigint) ?? 0n));

  // 2. Fetch User Positions
  const { 
    data: positionIds, 
    isLoading: isIdsLoading, 
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

  // 3. Prepare first multicall: fetch positions struct and pendingRewards
  const posContracts = useMemo(() => {
    if (!parsedPositionIds.length) return [];
    const calls: any[] = [];
    parsedPositionIds.forEach(id => {
      calls.push({ address: NFT_STAKING_ADDRESS, abi: NFT_STAKING_ABI, functionName: 'positions', args: [id] });
      calls.push({ address: NFT_STAKING_ADDRESS, abi: NFT_STAKING_ABI, functionName: 'pendingRewards', args: [id] });
    });
    return calls;
  }, [parsedPositionIds]);

  const { data: posData, isLoading: isPosLoading } = useReadContracts({
    contracts: posContracts,
    query: {
      enabled: posContracts.length > 0,
      refetchInterval: 12000,
    }
  });

  // 4. Parse Positions and Prepare Multiplier Multicall
  const intermediatePositions = useMemo(() => {
    if (!posData || !parsedPositionIds.length) return [];
    const parsed = [];
    for (let i = 0; i < parsedPositionIds.length; i++) {
      const pStruct = posData[i * 2];
      const pRewards = posData[i * 2 + 1];
      if (pStruct.status === 'success' && pRewards.status === 'success') {
        const struct = pStruct.result as any[];
        if (Number(struct[2]) > 0) { // amount > 0
          parsed.push({
            positionId: Number(struct[0]),
            tokenId: Number(struct[1]),
            amount: Number(struct[2]),
            startTime: Number(struct[3]),
            pendingRewards: pRewards.result as bigint,
          });
        }
      }
    }
    return parsed;
  }, [posData, parsedPositionIds]);

  const multiplierContracts = useMemo(() => {
    return intermediatePositions.map(p => ({
      address: NFT_STAKING_ADDRESS,
      abi: NFT_STAKING_ABI,
      functionName: 'getMultiplier',
      args: [BigInt(p.startTime)],
    })) as any[];
  }, [intermediatePositions]);

  const { data: multiplierData, isLoading: isMultiplierLoading } = useReadContracts({
    contracts: multiplierContracts,
    query: {
      enabled: multiplierContracts.length > 0,
      refetchInterval: 12000,
    }
  });

  // 5. Final Positions Compilation
  const finalPositions = useMemo(() => {
    return intermediatePositions.map((p, index) => {
      const mData = multiplierData?.[index];
      const multiplierBps = mData?.status === 'success' ? Number(mData.result) : 10000;
      return {
        ...p,
        multiplierBps,
      };
    });
  }, [intermediatePositions, multiplierData]);

  const totalPendingRewards = finalPositions.reduce((acc, pos) => acc + pos.pendingRewards, 0n);
  
  // Transaction Hooks
  const { 
    writeContract: writeClaim, 
    data: txHash, 
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();

  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const isTxPending = isWritePending || isTxWaiting;

  useEffect(() => {
    if (isTxSuccess) {
      refetchStaky();
    }
  }, [isTxSuccess, refetchStaky]);

  const handleClaimAll = () => {
    resetWrite();
    writeClaim({
      address: NFT_STAKING_ADDRESS,
      abi: NFT_STAKING_ABI,
      functionName: 'claimAllRewards',
    });
    // Add a manual timeout to refetch balance when tx triggers (or rely on isTxSuccess hook below)
  };

  const handleClaimSingle = (positionId: number) => {
    resetWrite();
    writeClaim({
      address: NFT_STAKING_ADDRESS,
      abi: NFT_STAKING_ABI,
      functionName: 'claimRewards',
      args: [BigInt(positionId)],
    });
  };

  const parseError = (error: any) => {
    if (!error) return null;
    const msg = error.shortMessage || error.message || '';
    if (msg.includes('InsufficientRewardPool') || msg.includes('execution reverted: InsufficientRewardPool')) {
      return 'The global reward pool does not have enough liquidity to cover your claim right now. Please try again later.';
    }
    return msg || 'Unknown error occurred';
  };

  const errorMsg = parseError(writeError);
  const isLoading = isGlobalLoading || isIdsLoading || isPosLoading || isMultiplierLoading;

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center mx-auto mb-6 text-foreground/50">
            <Coins className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Wallet Not Connected</h2>
          <p className="text-foreground/70">Connect your wallet to access your Rewards Dashboard and claim your STAKY earnings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Rewards Dashboard</h1>
          <p className="text-foreground/70 mt-2">Manage your earnings, track loyalty multipliers, and claim pending rewards.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* STAKY Balance Display */}
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-surface-elevated border border-surface-elevated shadow-[0_0_15px_rgba(124,58,237,0.1)]">
            <div className="w-8 h-8 rounded-full bg-electric/20 flex items-center justify-center text-electric">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-foreground/50 font-bold uppercase tracking-wider">Your STAKY Balance</p>
              <p className="text-lg font-extrabold text-white">
                {stakyBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} <span className="text-cyan text-xs">STAKY</span>
              </p>
            </div>
          </div>

          <button 
            onClick={handleClaimAll}
            disabled={totalPendingRewards === 0n || isTxPending || isLoading}
            className="px-6 py-3 rounded-xl bg-electric text-white font-bold transition-all hover:bg-bright-violet disabled:opacity-50 disabled:hover:bg-electric shadow-[0_0_20px_rgba(124,58,237,0.3)] disabled:shadow-none flex items-center gap-2 h-[52px]"
          >
            {isTxPending ? <><Loader2 className="w-5 h-5 animate-spin" /> Claiming...</> : 'Claim All Rewards'}
          </button>
        </div>
      </div>

      {isTxSuccess && (
        <div className="mb-8 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-400">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <p className="font-bold">Rewards claimed successfully! Your STAKY balance has been updated.</p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 text-sm">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="break-words font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Global & Core Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 rounded-2xl border border-electric/30 bg-surface-elevated/20 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-lg bg-electric/20 flex items-center justify-center text-electric">
              <Coins className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-wider">Live Pending Rewards</h3>
          </div>
          <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-electric to-cyan mt-4 flex items-baseline">
            {isLoading ? (
              <span className="animate-pulse bg-surface h-10 w-48 rounded inline-block" />
            ) : (
              <>
                {Number(formatEther(totalPendingRewards)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                <span className="text-lg text-cyan font-bold ml-2">STAKY</span>
              </>
            )}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-surface-elevated bg-surface-elevated/20 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-cyan">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-wider">Global Total Claimed</h3>
          </div>
          <div className="text-3xl font-extrabold text-white mt-4 flex items-baseline">
            {isLoading ? <span className="animate-pulse bg-surface h-8 w-32 rounded inline-block" /> : 
              <>
                {Number(formatEther(globalTotalClaimed)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="text-sm text-foreground/50 font-bold ml-2">STAKY</span>
              </>
            }
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-surface-elevated bg-surface-elevated/20 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-emerald-400">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground/70 uppercase tracking-wider">Global Pool Available</h3>
          </div>
          <div className="text-3xl font-extrabold text-white mt-4 flex items-baseline">
            {isLoading ? <span className="animate-pulse bg-surface h-8 w-32 rounded inline-block" /> : 
              <>
                {Number(formatEther(availablePoolBalance)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="text-sm text-foreground/50 font-bold ml-2">STAKY</span>
              </>
            }
          </div>
        </div>
      </div>

      {/* Positions Claim List */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-electric" />
          <h2 className="text-xl font-bold text-white">Position Rewards</h2>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground/50 border border-surface-elevated rounded-2xl bg-surface">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-electric" />
            <p>Loading your active rewards...</p>
          </div>
        ) : finalPositions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground/50 border border-surface-elevated rounded-2xl bg-surface-elevated/30">
            <Star className="w-12 h-12 mb-4 text-surface-elevated" />
            <p className="text-lg">No active staking positions found.</p>
            <p className="text-sm">Stake your NFTs to start earning STAKY rewards.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {finalPositions.map((pos) => (
              <div key={pos.positionId} className="p-6 rounded-2xl border border-surface-elevated bg-surface-elevated/20 transition-all hover:bg-surface-elevated/40 hover:border-cyan/30 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-surface-elevated shrink-0 shadow-lg">
                        <img src={`/assets/tiers/${pos.tokenId}.jpg`} alt={TIER_NAMES[pos.tokenId]} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider block mb-1">
                          Position #{pos.positionId}
                        </span>
                        <h3 className="text-lg font-bold text-white">{TIER_NAMES[pos.tokenId] || `Tier ID: ${pos.tokenId}`}</h3>
                        <p className="text-sm text-foreground/70 mt-1">Staked Amount: <span className="text-white font-bold">{pos.amount}</span></p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan/10 text-cyan border border-cyan/20 text-xs font-bold shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                      <Star className="w-3.5 h-3.5" /> {(pos.multiplierBps / 10000).toFixed(2)}x Multiplier
                    </div>
                  </div>

                  <div className="mb-6">
                    <span className="text-xs text-foreground/50 block mb-1">Live Pending Rewards</span>
                    <div className="text-3xl font-extrabold text-white">
                      {Number(formatEther(pos.pendingRewards)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} <span className="text-lg text-cyan font-bold">STAKY</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-elevated flex justify-end">
                  <button 
                    onClick={() => handleClaimSingle(pos.positionId)}
                    disabled={pos.pendingRewards === 0n || isTxPending}
                    className="px-5 py-2.5 rounded-lg bg-surface border border-surface-elevated text-white text-sm font-bold transition-all hover:bg-cyan hover:text-navy hover:border-cyan shadow-sm hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50 disabled:hover:bg-surface disabled:hover:text-white disabled:hover:border-surface-elevated disabled:shadow-none"
                  >
                    Claim Rewards
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
