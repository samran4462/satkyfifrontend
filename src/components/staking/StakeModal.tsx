import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Loader2, X, AlertCircle, CheckCircle2, Layers } from 'lucide-react';
import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, NFT_STAKING_ADDRESS, NFT_STAKING_ABI } from '../../config/contracts';

interface StakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: number[]; // e.g. [0, 5, 0, 2] corresponding to Tier 1, 2, 3, 4
}

const TIER_NAMES = ['Tier 1 (Bronze)', 'Tier 2 (Silver)', 'Tier 3 (Gold)', 'Tier 4 (Platinum)'];

export function StakeModal({ isOpen, onClose, balances }: StakeModalProps) {
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const { address } = useAccount();

  // Reset amounts when modal opens/closes
  useEffect(() => {
    setAmounts({});
  }, [isOpen]);

  const handleAmountChange = (index: number, value: string) => {
    setAmounts(prev => ({ ...prev, [index]: value }));
  };

  const handleMax = (index: number) => {
    setAmounts(prev => ({ ...prev, [index]: balances[index].toString() }));
  };

  // 1. Check Approval
  const { data: isApproved } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'isApprovedForAll',
    args: [address as `0x${string}`, NFT_STAKING_ADDRESS as `0x${string}`],
    query: {
      enabled: !!address && isOpen,
    },
  });

  // 2. Write Contracts setup
  const { 
    writeContract: writeApprove, 
    data: approveHash, 
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove
  } = useWriteContract();
  
  const { 
    writeContract: writeStake, 
    data: stakeHash, 
    isPending: isStakePending,
    error: stakeError,
    reset: resetStake
  } = useWriteContract();

  // 3. Wait for transactions
  const { isLoading: isApproveWaiting, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isStakeWaiting, isSuccess: isStakeSuccess } = useWaitForTransactionReceipt({
    hash: stakeHash,
  });

  const handleApprove = () => {
    resetApprove();
    resetStake();
    writeApprove({
      address: NFT_CONTRACT_ADDRESS,
      abi: NFT_CONTRACT_ABI,
      functionName: 'setApprovalForAll',
      args: [NFT_STAKING_ADDRESS as `0x${string}`, true],
    });
  };

  const stakePayload = useMemo(() => {
    const idsToStake: bigint[] = [];
    const amountsToStake: bigint[] = [];
    
    balances.forEach((balance, index) => {
      const inputAmount = parseInt(amounts[index] || '0');
      if (inputAmount > 0 && inputAmount <= balance) {
        // Token IDs are 1-indexed (index 0 -> ID 1)
        idsToStake.push(BigInt(index + 1));
        amountsToStake.push(BigInt(inputAmount));
      }
    });

    return { ids: idsToStake, amounts: amountsToStake };
  }, [amounts, balances]);

  const handleStake = () => {
    resetApprove();
    resetStake();
    
    if (stakePayload.ids.length === 0) return;
    
    writeStake({
      address: NFT_STAKING_ADDRESS,
      abi: NFT_STAKING_ABI,
      functionName: 'stakeBatch',
      args: [stakePayload.ids, stakePayload.amounts],
    });
  };

  const parseError = (error: any) => {
    if (!error) return null;
    const msg = error.shortMessage || error.message || 'Unknown error occurred';
    return msg;
  };

  const errorMsg = parseError(approveError || stakeError);
  const isActuallyApproved = isApproved || isApproveSuccess;
  const isTxPending = isApprovePending || isApproveWaiting || isStakePending || isStakeWaiting;
  
  // Validation: true if at least one token is selected and all inputs are valid
  const hasValidInputs = stakePayload.ids.length > 0;
  // Check if any input exceeds balance
  const hasInvalidAmount = balances.some((balance, index) => {
    const input = parseInt(amounts[index] || '0');
    return input > balance || input < 0;
  });

  const isStakeDisabled = isTxPending || !hasValidInputs || hasInvalidAmount;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-obsidian/80 backdrop-blur-sm" onClick={!isTxPending ? onClose : undefined} />
      
      <div className="relative w-full max-w-md bg-surface border border-surface-elevated rounded-2xl shadow-[0_0_50px_rgba(234,179,8,0.15)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-elevated shrink-0">
          <h2 className="text-xl font-bold text-white">Batch Stake NFTs</h2>
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
          {isStakeSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Staking Successful!</h3>
              <p className="text-foreground/70">Your NFTs have been successfully staked in batch and are now earning STAKY rewards.</p>
              <button 
                onClick={onClose}
                className="mt-4 w-full px-4 py-3 rounded-xl bg-surface-elevated text-white font-medium hover:bg-navy transition-colors border border-surface"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Token List */}
              <div className="space-y-4">
                <p className="text-sm text-foreground/70">Select the amounts for each tier you wish to stake simultaneously.</p>
                
                {balances.map((balance, index) => {
                  if (balance <= 0) return null;
                  
                  return (
                    <div key={index} className="p-4 rounded-xl border border-surface-elevated bg-surface-elevated/30">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-electric/20 text-electric flex items-center justify-center">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-white block">{TIER_NAMES[index]}</span>
                            <span className="text-xs text-foreground/50">Owned: {balance}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <input 
                          type="number" 
                          min="0"
                          max={balance}
                          value={amounts[index] || ''}
                          onChange={(e) => handleAmountChange(index, e.target.value)}
                          disabled={isTxPending}
                          placeholder="0"
                          className="w-full bg-surface border border-surface-elevated focus:border-electric rounded-lg px-3 py-2 text-white outline-none transition-colors text-sm"
                        />
                        <button 
                          onClick={() => handleMax(index)}
                          disabled={isTxPending}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-electric hover:text-bright-violet px-2 py-1 bg-electric/10 rounded-md"
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Status/Error */}
              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="break-words">{errorMsg}</p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-surface-elevated">
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-foreground/70">Total Selected:</span>
                  <span className="font-bold text-white">{stakePayload.amounts.reduce((a, b) => Number(a) + Number(b), 0)} NFTs</span>
                </div>

                {!isActuallyApproved ? (
                  <button 
                    onClick={handleApprove}
                    disabled={isTxPending}
                    className="w-full px-4 py-3 rounded-xl bg-surface-elevated text-white font-bold hover:bg-navy transition-colors disabled:opacity-50 flex items-center justify-center gap-2 border border-surface"
                  >
                    {(isApprovePending || isApproveWaiting) ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Approving...</>
                    ) : (
                      'Approve Staking Contract'
                    )}
                  </button>
                ) : (
                  <button 
                    onClick={handleStake}
                    disabled={isStakeDisabled}
                    className="w-full px-4 py-3 rounded-xl bg-electric text-black font-bold hover:bg-bright-violet transition-colors disabled:opacity-50 disabled:hover:bg-electric flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                  >
                    {(isStakePending || isStakeWaiting) ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Staking...</>
                    ) : (
                      'Stake Selected NFTs'
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
