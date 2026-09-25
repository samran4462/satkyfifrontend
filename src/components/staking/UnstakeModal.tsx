import { useState, useEffect, useMemo } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Loader2, X, AlertCircle, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { formatEther } from 'viem';
import { NFT_STAKING_ADDRESS, NFT_STAKING_ABI } from '../../config/contracts';
import type { PositionData } from '../../pages/MyStaking';

interface UnstakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions: PositionData[];
  lockDuration: number;
  penaltyBps: number;
}

function LiveCountdown({ startTime, lockDuration }: { startTime: number, lockDuration: number }) {
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

  if (remaining === 0) return <span>Unlocked</span>;

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);

  return <span>{days}d {hours}h {mins}m left</span>;
}

export function UnstakeModal({ isOpen, onClose, positions, lockDuration, penaltyBps }: UnstakeModalProps) {
  const isBatch = positions.length > 1;
  const isAnyLocked = positions.some(p => p.isLocked);

  // Totals
  const totalStaked = positions.reduce((acc, p) => acc + p.amount, 0);
  const totalPendingRewards = positions.reduce((acc, p) => acc + p.pendingRewards, 0n);
  
  // Calculate penalties per position to be exact
  const estimatedPenalty = useMemo(() => {
    return positions.reduce((acc, p) => {
      if (p.isLocked) {
        return acc + (p.pendingRewards * BigInt(penaltyBps)) / 10000n;
      }
      return acc;
    }, 0n);
  }, [positions, penaltyBps]);

  const netRewards = totalPendingRewards - estimatedPenalty;

  // Transaction Hooks
  const { 
    writeContract: writeUnstake, 
    data: txHash, 
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();

  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const isTxPending = isWritePending || isTxWaiting;

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      resetWrite();
    }
  }, [isOpen, resetWrite]);

  const handleUnstake = () => {
    resetWrite();
    
    if (isBatch) {
      const positionIds = positions.map(p => BigInt(p.positionId));
      writeUnstake({
        address: NFT_STAKING_ADDRESS,
        abi: NFT_STAKING_ABI,
        functionName: 'unstakeBatch',
        args: [positionIds],
      });
    } else {
      writeUnstake({
        address: NFT_STAKING_ADDRESS,
        abi: NFT_STAKING_ABI,
        functionName: 'unstake',
        args: [BigInt(positions[0].positionId)],
      });
    }
  };

  const parseError = (error: any) => {
    if (!error) return null;
    return error.shortMessage || error.message || 'Unknown error occurred';
  };

  const errorMsg = parseError(writeError);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-obsidian/80 backdrop-blur-sm" onClick={!isTxPending ? onClose : undefined} />
      
      <div className={`relative w-full max-w-md bg-surface border rounded-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isAnyLocked 
          ? 'border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15)]' 
          : 'border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.15)]'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b shrink-0 ${
          isAnyLocked ? 'border-red-500/20 bg-red-500/5' : 'border-green-500/20 bg-green-500/5'
        }`}>
          <div className="flex items-center gap-3">
            {isAnyLocked ? (
              <ShieldAlert className="w-6 h-6 text-red-400" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-green-400" />
            )}
            <h2 className="text-xl font-bold text-white">
              {isBatch ? 'Batch Unstake' : 'Unstake Position'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            disabled={isTxPending}
            className="text-foreground/50 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {isTxSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Unstaking Successful!</h3>
              <p className="text-foreground/70">Your NFTs and net rewards have been securely transferred to your wallet.</p>
              <button 
                onClick={onClose}
                className="mt-4 w-full px-4 py-3 rounded-xl bg-surface-elevated text-white font-medium hover:bg-navy transition-colors border border-surface"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Warning / Info Banner */}
              {isAnyLocked ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col gap-2 text-red-400 text-sm">
                  <p className="font-bold">⚠️ Early Unstake Warning</p>
                  <p>You are unstaking before the mandatory lock period has expired for one or more positions. An early unstaking penalty will be deducted from your pending rewards.</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex flex-col gap-2 text-green-400 text-sm">
                  <p className="font-bold">✓ Safe Unstake</p>
                  <p>All selected positions have completed their lock period. You will receive 100% of your accumulated rewards without any penalties.</p>
                </div>
              )}

              {/* Breakdown */}
              <div className="space-y-3 p-5 rounded-xl border border-surface-elevated bg-surface-elevated/30">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-foreground/70">Total NFTs to Return</span>
                  <span className="font-bold text-white">{totalStaked} NFTs</span>
                </div>
                
                {isAnyLocked && !isBatch && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-foreground/70">Remaining Lock Time</span>
                    <span className="font-bold text-red-400">
                      <LiveCountdown startTime={positions[0].startTime} lockDuration={lockDuration} />
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-foreground/70">Total Pending Rewards</span>
                  <span className="font-bold text-white">{Number(formatEther(totalPendingRewards)).toLocaleString(undefined, { maximumFractionDigits: 6 })} AURA</span>
                </div>
                
                {isAnyLocked && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-foreground/70">Penalty Rate</span>
                      <span className="font-bold text-red-400">{(penaltyBps / 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-foreground/70">Penalty Deduction</span>
                      <span className="font-bold text-red-400">-{Number(formatEther(estimatedPenalty)).toLocaleString(undefined, { maximumFractionDigits: 6 })} AURA</span>
                    </div>
                  </>
                )}
                
                <div className="pt-3 mt-3 border-t border-surface-elevated flex justify-between items-center">
                  <span className="text-sm font-bold text-white">Net Rewards to Receive</span>
                  <span className="text-lg font-extrabold text-cyan">{Number(formatEther(netRewards)).toLocaleString(undefined, { maximumFractionDigits: 6 })} AURA</span>
                </div>
              </div>

              {/* Status/Error */}
              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="break-words">{errorMsg}</p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2">
                <button 
                  onClick={handleUnstake}
                  disabled={isTxPending}
                  className={`w-full px-4 py-3 rounded-xl text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                    isAnyLocked 
                      ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
                      : 'bg-green-500 hover:bg-green-600 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                  }`}
                >
                  {isTxPending ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : (
                    isAnyLocked ? 'Confirm Early Unstake' : 'Confirm Safe Unstake'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
