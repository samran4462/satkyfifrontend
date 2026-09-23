import { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ShieldAlert, ShieldCheck, Clock, Settings, Loader2, CheckCircle2, AlertCircle, Play, Trash2 } from 'lucide-react';
import { encodeAbiParameters, parseEther } from 'viem';
import { NFT_STAKING_ADDRESS, NFT_STAKING_ABI } from '../config/contracts';

// Constant Keys for Proposal Struct Mapping
const PARAMS = [
  { name: 'Reward Rate', funcName: 'PARAM_REWARD_RATE', requiresRewardRole: true },
  { name: 'Loyalty Tiers', funcName: 'PARAM_LOYALTY_TIER', requiresRewardRole: false },
  { name: 'Staking Fee', funcName: 'PARAM_STAKING_FEE', requiresRewardRole: false },
  { name: 'Unstaking Penalty', funcName: 'PARAM_UNSTAKING_PENALTY', requiresRewardRole: false }
];

export function Admin() {
  const { address, isConnected } = useAccount();

  // Correct keccak256 hashes — used as fallback while contract fetch loads
  const PARAM_MANAGER_HASH = '0xf7e61c4e74c42df4eeae815b78ea28052584091f2e136a00ad566b99fd705839' as `0x${string}`;
  const REWARD_MANAGER_HASH = '0x0f51adb3f49e4a9bbb17b3783f025995eaf8c24be2c8eefff214bdfda05ef94d' as `0x${string}`;

  // Fetch Role and Parameter Hashes from contract (source of truth)
  const { data: hashesData, isLoading: isHashesLoading } = useReadContracts({
    contracts: [
      { address: NFT_STAKING_ADDRESS, abi: NFT_STAKING_ABI, functionName: 'PARAMETER_MANAGER_ROLE' },
      { address: NFT_STAKING_ADDRESS, abi: NFT_STAKING_ABI, functionName: 'REWARD_MANAGER_ROLE' },
      ...PARAMS.map(p => ({ address: NFT_STAKING_ADDRESS, abi: NFT_STAKING_ABI, functionName: p.funcName }))
    ] as any[],
    query: { enabled: true }
  });

  const paramManagerRole = (hashesData?.[0]?.result ?? PARAM_MANAGER_HASH) as `0x${string}`;
  const rewardManagerRole = (hashesData?.[1]?.result ?? REWARD_MANAGER_HASH) as `0x${string}`;
  
  const paramHashes = useMemo(() => {
    if (!hashesData) return [];
    return PARAMS.map((p, i) => ({
      ...p,
      hash: hashesData[i + 2]?.result as `0x${string}`
    }));
  }, [hashesData]);

  // Fetch Roles for User — always enabled when wallet is connected
  const { data: userRolesData, isLoading: isRolesLoading } = useReadContracts({
    contracts: [
      { address: NFT_STAKING_ADDRESS, abi: NFT_STAKING_ABI, functionName: 'hasRole', args: [paramManagerRole, address as `0x${string}`] },
      { address: NFT_STAKING_ADDRESS, abi: NFT_STAKING_ABI, functionName: 'hasRole', args: [rewardManagerRole, address as `0x${string}`] }
    ] as any[],
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    }
  });

  const hasParamRole = !!userRolesData?.[0]?.result;
  const hasRewardRole = !!userRolesData?.[1]?.result;
  const isAuthorized = hasParamRole || hasRewardRole;

  // Fetch Proposals
  const proposalContracts = useMemo(() => {
    return paramHashes.filter(p => p.hash).map(p => ({
      address: NFT_STAKING_ADDRESS,
      abi: NFT_STAKING_ABI,
      functionName: 'parameterProposals',
      args: [p.hash]
    }));
  }, [paramHashes]);

  const { data: proposalsData, refetch: refetchProposals } = useReadContracts({
    contracts: proposalContracts as any[],
    query: {
      enabled: proposalContracts.length > 0 && isAuthorized,
      refetchInterval: 12000,
    }
  });

  const proposals = useMemo(() => {
    if (!proposalsData) return [];
    return paramHashes.map((p, i) => {
      const data = proposalsData[i]?.result as any;
      if (!data) return null;
      return {
        ...p,
        parameterId: data[0],
        data: data[1],
        executeAfter: Number(data[2]),
        executed: data[3],
        canceled: data[4],
        proposer: data[5]
      };
    }).filter((p): p is NonNullable<typeof p> => p !== null && p.executeAfter > 0 && !p.executed && !p.canceled);
  }, [proposalsData, paramHashes]);

  // Transaction Setup
  const { writeContract, data: txHash, isPending: isWritePending, error: writeError, reset } = useWriteContract();
  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const isTxPending = isWritePending || isTxWaiting;

  // UI State for Modal
  const [activeParamIndex, setActiveParamIndex] = useState<number>(0);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (isTxSuccess) {
      refetchProposals();
      setInputs({});
    }
  }, [isTxSuccess, refetchProposals]);

  const handlePropose = () => {
    reset();
    const param = paramHashes[activeParamIndex];
    if (!param.hash) return;

    let encodedData: `0x${string}` = '0x';

    try {
      if (param.funcName === 'PARAM_REWARD_RATE') {
        encodedData = encodeAbiParameters(
          [{ type: 'uint256' }, { type: 'uint256' }],
          [BigInt(inputs.tokenId || 0), parseEther(inputs.rate || '0')]
        );
      } else if (param.funcName === 'PARAM_LOYALTY_TIER') {
        encodedData = encodeAbiParameters(
          [{ type: 'uint256' }, { type: 'uint256' }],
          [BigInt(inputs.minDuration || 0), BigInt(inputs.multiplierBps || 0)]
        );
      } else if (param.funcName === 'PARAM_STAKING_FEE') {
        encodedData = encodeAbiParameters(
          [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }],
          [parseEther(inputs.fee || '0'), BigInt(inputs.treasuryBps || 0), BigInt(inputs.rewardPoolBps || 0)]
        );
      } else if (param.funcName === 'PARAM_UNSTAKING_PENALTY') {
        encodedData = encodeAbiParameters(
          [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }],
          [BigInt(inputs.lockDuration || 0), BigInt(inputs.penaltyBps || 0), BigInt(inputs.penaltyTreasuryBps || 0), BigInt(inputs.penaltyRewardPoolBps || 0)]
        );
      }

      writeContract({
        address: NFT_STAKING_ADDRESS,
        abi: NFT_STAKING_ABI,
        functionName: 'proposeParameterChange',
        args: [param.hash, encodedData]
      });
    } catch (err) {
      console.error("Encoding error", err);
    }
  };

  const handleAction = (hash: `0x${string}`, isExecute: boolean) => {
    reset();
    writeContract({
      address: NFT_STAKING_ADDRESS,
      abi: NFT_STAKING_ABI,
      functionName: isExecute ? 'executeParameterChange' : 'cancelParameterChange',
      args: [hash]
    });
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <div className="text-center p-10 bg-surface rounded-2xl max-w-md">
          <ShieldAlert className="w-16 h-16 text-foreground/50 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
          <p className="text-foreground/70">Connect your wallet to access the Admin Dashboard.</p>
        </div>
      </div>
    );
  }

  if (isHashesLoading || isRolesLoading) {
    return (
      <div className="container mx-auto px-4 py-32 flex justify-center text-electric">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <div className="text-center p-10 bg-surface border border-red-500/20 rounded-2xl max-w-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Unauthorized</h2>
          <p className="text-foreground/70">Your connected wallet does not have the PARAMETER_MANAGER_ROLE or REWARD_MANAGER_ROLE required to access this dashboard.</p>
        </div>
      </div>
    );
  }

  const activeParam = paramHashes[activeParamIndex];
  const canProposeActive = (activeParam.requiresRewardRole ? hasRewardRole : hasParamRole);

  const parseError = (error: any) => {
    if (!error) return null;
    return error.shortMessage || error.message || 'Unknown error occurred';
  };
  const errorMsg = parseError(writeError);
  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 rounded-xl bg-electric/20 flex items-center justify-center text-electric">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white">Governance Admin</h1>
          <div className="flex gap-4 mt-2 text-sm font-medium">
            <span className={`flex items-center gap-1 ${hasParamRole ? 'text-green-400' : 'text-foreground/50'}`}>
              <ShieldCheck className="w-4 h-4" /> Parameter Manager
            </span>
            <span className={`flex items-center gap-1 ${hasRewardRole ? 'text-green-400' : 'text-foreground/50'}`}>
              <ShieldCheck className="w-4 h-4" /> Reward Manager
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Proposal Submission Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface-elevated/30 border border-surface-elevated rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">New Proposal</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground/70 mb-2">Parameter Type</label>
                <select 
                  className="w-full bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white outline-none focus:border-electric"
                  value={activeParamIndex}
                  onChange={(e) => {
                    setActiveParamIndex(Number(e.target.value));
                    setInputs({});
                  }}
                >
                  {paramHashes.map((p, i) => (
                    <option key={i} value={i}>{p.name}</option>
                  ))}
                </select>
              </div>

              {!canProposeActive ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  You do not have the required role to propose changes to this parameter.
                </div>
              ) : (
                <div className="space-y-4 pt-4 border-t border-surface-elevated">
                  {activeParam.funcName === 'PARAM_REWARD_RATE' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">Tier / Token ID</label>
                        <input type="number" className="w-full bg-surface border border-surface-elevated rounded-lg px-4 py-2 text-white" value={inputs.tokenId || ''} onChange={e => setInputs({...inputs, tokenId: e.target.value})} placeholder="e.g. 1" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">Reward Rate (STAKY/sec)</label>
                        <input type="text" className="w-full bg-surface border border-surface-elevated rounded-lg px-4 py-2 text-white" value={inputs.rate || ''} onChange={e => setInputs({...inputs, rate: e.target.value})} placeholder="e.g. 0.05" />
                      </div>
                    </>
                  )}
                  {activeParam.funcName === 'PARAM_LOYALTY_TIER' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">Min Duration (seconds)</label>
                        <input type="number" className="w-full bg-surface border border-surface-elevated rounded-lg px-4 py-2 text-white" value={inputs.minDuration || ''} onChange={e => setInputs({...inputs, minDuration: e.target.value})} placeholder="e.g. 864000" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">Multiplier BPS (e.g. 15000 = 1.5x)</label>
                        <input type="number" className="w-full bg-surface border border-surface-elevated rounded-lg px-4 py-2 text-white" value={inputs.multiplierBps || ''} onChange={e => setInputs({...inputs, multiplierBps: e.target.value})} placeholder="e.g. 15000" />
                      </div>
                    </>
                  )}
                  {activeParam.funcName === 'PARAM_STAKING_FEE' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">Staking Fee (ETH)</label>
                        <input type="text" className="w-full bg-surface border border-surface-elevated rounded-lg px-4 py-2 text-white" value={inputs.fee || ''} onChange={e => setInputs({...inputs, fee: e.target.value})} placeholder="e.g. 0.001" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">Treasury Share BPS</label>
                        <input type="number" className="w-full bg-surface border border-surface-elevated rounded-lg px-4 py-2 text-white" value={inputs.treasuryBps || ''} onChange={e => setInputs({...inputs, treasuryBps: e.target.value})} placeholder="e.g. 8000" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">Reward Pool Share BPS</label>
                        <input type="number" className="w-full bg-surface border border-surface-elevated rounded-lg px-4 py-2 text-white" value={inputs.rewardPoolBps || ''} onChange={e => setInputs({...inputs, rewardPoolBps: e.target.value})} placeholder="e.g. 2000" />
                      </div>
                    </>
                  )}
                  {activeParam.funcName === 'PARAM_UNSTAKING_PENALTY' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">Lock Duration (seconds)</label>
                        <input type="number" className="w-full bg-surface border border-surface-elevated rounded-lg px-4 py-2 text-white" value={inputs.lockDuration || ''} onChange={e => setInputs({...inputs, lockDuration: e.target.value})} placeholder="e.g. 604800" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">Penalty BPS (e.g. 2000 = 20%)</label>
                        <input type="number" className="w-full bg-surface border border-surface-elevated rounded-lg px-4 py-2 text-white" value={inputs.penaltyBps || ''} onChange={e => setInputs({...inputs, penaltyBps: e.target.value})} placeholder="e.g. 2000" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">Treasury Share BPS</label>
                        <input type="number" className="w-full bg-surface border border-surface-elevated rounded-lg px-4 py-2 text-white" value={inputs.penaltyTreasuryBps || ''} onChange={e => setInputs({...inputs, penaltyTreasuryBps: e.target.value})} placeholder="e.g. 5000" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">Reward Pool Share BPS</label>
                        <input type="number" className="w-full bg-surface border border-surface-elevated rounded-lg px-4 py-2 text-white" value={inputs.penaltyRewardPoolBps || ''} onChange={e => setInputs({...inputs, penaltyRewardPoolBps: e.target.value})} placeholder="e.g. 5000" />
                      </div>
                    </>
                  )}
                  
                  <button 
                    onClick={handlePropose}
                    disabled={isTxPending}
                    className="w-full mt-4 px-4 py-3 bg-electric hover:bg-bright-violet text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    {isTxPending ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : 'Submit Proposal'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Proposals Tracker */}
        <div className="lg:col-span-2">
          <div className="bg-surface-elevated/30 border border-surface-elevated rounded-2xl p-6 h-full min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan" /> Pending Timelocks
              </h2>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="break-words">{errorMsg}</p>
              </div>
            )}

            {isTxSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex gap-3 text-green-400 text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p className="break-words font-bold">Transaction Confirmed!</p>
              </div>
            )}

            {proposals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-foreground/50 border border-surface border-dashed rounded-xl">
                <ShieldCheck className="w-12 h-12 mb-3 text-surface-elevated" />
                <p>No active proposals pending execution.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {proposals.map((p, i) => {
                  const isReady = now >= p.executeAfter;
                  const canManage = p.requiresRewardRole ? hasRewardRole : hasParamRole;
                  
                  return (
                    <div key={i} className="bg-surface border border-surface-elevated rounded-xl p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-white">{p.name}</h3>
                            {isReady ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 uppercase">Ready</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 uppercase">Locked</span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-foreground/50">Proposer: {p.proposer}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 pt-4 border-t border-surface-elevated">
                        <button
                          onClick={() => handleAction(p.hash, true)}
                          disabled={!isReady || isTxPending || !canManage}
                          className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold text-sm rounded-lg transition-colors disabled:opacity-30 flex items-center gap-1.5 border border-green-500/30"
                        >
                          <Play className="w-4 h-4" /> Execute
                        </button>
                        <button
                          onClick={() => handleAction(p.hash, false)}
                          disabled={isTxPending || !canManage}
                          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm rounded-lg transition-colors disabled:opacity-30 flex items-center gap-1.5 border border-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" /> Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
