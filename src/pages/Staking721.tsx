import { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Layers, Loader2, CheckCircle2, AlertCircle, Lock, Unlock, Coins } from 'lucide-react';
import { formatEther } from 'viem';
import NFTStaking721Artifact from '../config/abis/NFTStaking721.json';

const STAKING_721_ADDRESS = '0x1aa145d9D5AfBf38a6D328F43F40665a2392D107' as `0x${string}`;
const ELN_NFT_ADDRESS     = '0xCe56eceA6BBda665255a6E5f497168F22E131cFF' as `0x${string}`;
const STAKY_TOKEN_ADDRESS = '0xcD6e413F8Dec4cd8919412E11B1db905bE89fB61' as `0x${string}`;
const STAKING_721_ABI     = NFTStaking721Artifact.abi;

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] }
] as const;

const ERC721_ABI = [
  { name: 'balanceOf',         type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }],                                                   outputs: [{ type: 'uint256' }] },
  { name: 'isApprovedForAll',  type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }, { name: 'operator', type: 'address' }],            outputs: [{ type: 'bool' }] },
  { name: 'setApprovalForAll', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }],            outputs: [] },
  { name: 'name',              type: 'function', stateMutability: 'view',       inputs: [],                                                                                      outputs: [{ type: 'string' }] },
  { name: 'tokenOfOwnerByIndex', type: 'function', stateMutability: 'view',    inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }],              outputs: [{ type: 'uint256' }] },
  { name: 'tokenURI',          type: 'function', stateMutability: 'view',       inputs: [{ name: 'tokenId', type: 'uint256' }],                                                outputs: [{ type: 'string' }] },
] as const;

function parseError(err: any): string | null {
  if (!err) return null;
  return err.shortMessage || err.message?.slice(0, 120) || 'Unknown error';
}

function StakedNFTCard({ pos, handleClaim, handleUnstake, isTxPending, nftName }: any) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  const { data: tokenURI } = useReadContract({
    address: ELN_NFT_ADDRESS,
    abi: ERC721_ABI,
    functionName: 'tokenURI',
    args: [BigInt(pos.tokenId)],
    query: { enabled: true }
  });

  useEffect(() => {
    if (!tokenURI) return;
    const fetchMetadata = async () => {
      try {
        let uri = tokenURI as string;
        if (uri.startsWith('ipfs://')) {
          uri = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
        }
        const res = await fetch(uri);
        const data = await res.json();
        if (data.image) {
          let img = data.image;
          if (img.startsWith('ipfs://')) {
            img = img.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
          }
          setImageUrl(img);
        }
      } catch (e) {
        console.error("Failed to fetch NFT metadata", e);
      } finally {
        setImageLoading(false);
      }
    };
    fetchMetadata();
  }, [tokenURI]);

  const days  = Math.floor(pos.elapsed / 86400);
  const hours = Math.floor((pos.elapsed % 86400) / 3600);
  const mins  = Math.floor((pos.elapsed % 3600) / 60);

  return (
    <div className="p-5 bg-surface border border-surface-elevated rounded-xl hover:border-electric/40 transition-all flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs text-foreground/50 font-bold uppercase tracking-wider block mb-1">Position #{pos.positionId}</span>
          <h3 className="text-lg font-bold text-white">{nftName} #{pos.tokenId}</h3>
        </div>
        <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30">Active</span>
      </div>

      <div className="w-full aspect-square rounded-lg bg-surface-elevated overflow-hidden mb-4 relative flex items-center justify-center border border-surface-elevated">
        {imageLoading && <Loader2 className="w-8 h-8 animate-spin text-electric opacity-50 absolute" />}
        {imageUrl ? (
          <img src={imageUrl} alt={`${nftName} #${pos.tokenId}`} className="w-full h-full object-cover" />
        ) : !imageLoading && (
          <Layers className="w-12 h-12 text-foreground/20" />
        )}
      </div>

      <div className="space-y-2 mb-4 text-sm mt-auto">
        <div className="flex justify-between">
          <span className="text-foreground/60">Staked Duration</span>
          <span className="text-white font-medium">
            {days > 0 ? `${days}d ` : ''}{hours > 0 ? `${hours}h ` : ''}{mins}m
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground/60">Pending Rewards</span>
          <span className="text-cyan font-bold">
            {Number(formatEther(pos.pendingRewards)).toFixed(4)} STAKY
          </span>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-surface-elevated">
        <button onClick={() => handleClaim(pos.positionId)} disabled={pos.pendingRewards === 0n || isTxPending}
          className="flex-1 py-2 text-sm font-bold bg-surface-elevated hover:bg-cyan hover:text-navy rounded-lg transition-all disabled:opacity-40">
          Claim
        </button>
        <button onClick={() => handleUnstake(pos.positionId)} disabled={isTxPending}
          className="flex-1 py-2 text-sm font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-all disabled:opacity-40">
          Unstake
        </button>
      </div>
    </div>
  );
}

export function Staking721() {
  const { address, isConnected } = useAccount();
  const [stakeTokenId, setStakeTokenId] = useState('');

  // ── NFT Balance & Approval ──────────────────────────────────────────────
  const { data: nftData, isLoading: isNftLoading, refetch: refetchNft } = useReadContracts({
    contracts: [
      { address: ELN_NFT_ADDRESS, abi: ERC721_ABI, functionName: 'name' },
      { address: ELN_NFT_ADDRESS, abi: ERC721_ABI, functionName: 'balanceOf',        args: [address as `0x${string}`] },
      { address: ELN_NFT_ADDRESS, abi: ERC721_ABI, functionName: 'isApprovedForAll', args: [address as `0x${string}`, STAKING_721_ADDRESS] },
    ] as any[],
    query: { enabled: !!address }
  });

  const nftName    = (nftData?.[0]?.result as string) ?? 'ERC-721 NFT';
  const nftBalance = Number((nftData?.[1]?.result as bigint) ?? 0n);
  const isApproved = !!(nftData?.[2]?.result as boolean);

  // ── User's STAKY Balance ────────────────────────────────────────────────
  const { data: stakyData, refetch: refetchStaky } = useReadContract({
    address: STAKY_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { enabled: !!address }
  });
  const stakyBalance = Number(formatEther((stakyData as bigint) ?? 0n));


  // ── User's Staked Positions ─────────────────────────────────────────────
  const { data: positionIds, refetch: refetchPositions } = useReadContract({
    address: STAKING_721_ADDRESS,
    abi: STAKING_721_ABI,
    functionName: 'getUserPositions',
    args: [address as `0x${string}`],
    query: { enabled: !!address }
  } as any);

  const ids = useMemo(() => (positionIds as bigint[] ?? []).map(Number), [positionIds]);

  const positionContracts = useMemo(() => ids.flatMap(id => ([
    { address: STAKING_721_ADDRESS, abi: STAKING_721_ABI, functionName: 'positions',      args: [BigInt(id)] },
    { address: STAKING_721_ADDRESS, abi: STAKING_721_ABI, functionName: 'pendingRewards', args: [BigInt(id)] },
  ])), [ids]);

  const { data: positionsData, refetch: refetchPosData } = useReadContracts({
    contracts: positionContracts as any[],
    query: { enabled: ids.length > 0, refetchInterval: 10000 }
  });

  const positions = useMemo(() => {
    if (!positionsData) return [];
    return ids.map((id, i) => {
      const pos = positionsData[i * 2]?.result as any;
      const rewards = (positionsData[i * 2 + 1]?.result as bigint) ?? 0n;
      if (!pos || !pos[4]) return null; // active = pos[4]
      const elapsed = Math.floor(Date.now() / 1000) - Number(pos[3]);
      return { positionId: id, nftContract: pos[0], tokenId: Number(pos[1]), staker: pos[2], startTime: Number(pos[3]), elapsed, pendingRewards: rewards, active: pos[4] };
    }).filter(Boolean);
  }, [positionsData, ids]);

  // ── Write Contracts ─────────────────────────────────────────────────────
  const { writeContract, data: txHash, isPending: isWritePending, error: writeError, reset } = useWriteContract();
  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const isTxPending = isWritePending || isTxWaiting;
  const errorMsg = parseError(writeError);

  useEffect(() => {
    if (isTxSuccess) { refetchNft(); refetchPositions(); refetchPosData(); refetchStaky(); }
  }, [isTxSuccess]);

  const handleApprove = () => { reset(); writeContract({ address: ELN_NFT_ADDRESS, abi: ERC721_ABI, functionName: 'setApprovalForAll', args: [STAKING_721_ADDRESS, true] }); };
  const handleStake   = () => { reset(); writeContract({ address: STAKING_721_ADDRESS, abi: STAKING_721_ABI, functionName: 'stake', args: [ELN_NFT_ADDRESS, BigInt(stakeTokenId)] } as any); };
  const handleUnstake = (id: number) => { reset(); writeContract({ address: STAKING_721_ADDRESS, abi: STAKING_721_ABI, functionName: 'unstake', args: [BigInt(id)] } as any); };
  const handleClaim   = (id: number) => { reset(); writeContract({ address: STAKING_721_ADDRESS, abi: STAKING_721_ABI, functionName: 'claimRewards', args: [BigInt(id)] } as any); };

  if (!isConnected) return (
    <div className="container mx-auto px-4 py-20 flex justify-center">
      <div className="text-center p-10 bg-surface rounded-2xl max-w-md">
        <Layers className="w-16 h-16 text-foreground/50 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
        <p className="text-foreground/70">Connect your wallet to stake ERC-721 NFTs.</p>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-electric/20 flex items-center justify-center text-electric">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white">ERC-721 Staking</h1>
            <p className="text-foreground/70 mt-1">Stake your <span className="text-cyan font-bold">{nftName}</span> NFTs and earn STAKY rewards</p>
          </div>
        </div>

        {/* STAKY Balance Display */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-surface-elevated border border-surface-elevated shadow-[0_0_15px_rgba(124,58,237,0.1)]">
          <div className="w-10 h-10 rounded-full bg-electric/20 flex items-center justify-center text-electric">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-foreground/50 font-bold uppercase tracking-wider">Your STAKY Balance</p>
            <p className="text-xl font-extrabold text-white">
              {stakyBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} <span className="text-cyan text-sm">STAKY</span>
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /><p className="break-words">{errorMsg}</p>
        </div>
      )}
      {isTxSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex gap-3 text-green-400">
          <CheckCircle2 className="w-5 h-5 shrink-0" /><p className="font-bold">Transaction confirmed!</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stake Panel */}
        <div className="lg:col-span-1">
          <div className="bg-surface-elevated/30 border border-surface-elevated rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Stake NFT</h2>

            {/* Wallet Info */}
            <div className="mb-6 p-4 rounded-xl bg-surface border border-surface-elevated">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-foreground/70">Wallet Balance</span>
                <span className="text-white font-bold">{isNftLoading ? '...' : nftBalance} {nftName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-foreground/70">Staking Approval</span>
                {isApproved
                  ? <span className="text-green-400 font-bold text-sm flex items-center gap-1"><Unlock className="w-3.5 h-3.5" /> Approved</span>
                  : <span className="text-amber-400 font-bold text-sm flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Not Approved</span>
                }
              </div>
            </div>

            {!isApproved ? (
              <button onClick={handleApprove} disabled={isTxPending}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isTxPending ? <><Loader2 className="w-5 h-5 animate-spin" /> Approving...</> : '🔓 Approve Staking Contract'}
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/70 mb-2">Token ID to Stake</label>
                  <input
                    type="number" min="0"
                    value={stakeTokenId}
                    onChange={e => setStakeTokenId(e.target.value)}
                    placeholder="Enter your NFT Token ID"
                    className="w-full bg-surface border border-surface-elevated rounded-xl px-4 py-3 text-white outline-none focus:border-electric"
                  />
                  <p className="text-xs text-foreground/50 mt-1">Check MetaMask or Etherscan for your token ID</p>
                </div>
                <button
                  onClick={handleStake}
                  disabled={!stakeTokenId || isTxPending || nftBalance === 0}
                  className="w-full py-3 bg-electric hover:bg-bright-violet text-white font-bold rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2">
                  {isTxPending ? <><Loader2 className="w-5 h-5 animate-spin" /> Staking...</> : 'Stake NFT'}
                </button>
              </div>
            )}

            {/* Info */}
            <div className="mt-6 p-4 rounded-xl bg-surface border border-surface-elevated text-xs text-foreground/50 space-y-1">
              <p>📋 Collection: <span className="text-cyan font-mono">{ELN_NFT_ADDRESS.slice(0,8)}...</span></p>
              <p>💰 Reward Rate: <span className="text-cyan">10 STAKY / NFT / day</span></p>
              <p>🔓 No lock period — unstake anytime</p>
            </div>
          </div>
        </div>

        {/* Active Positions */}
        <div className="lg:col-span-2">
          <div className="bg-surface-elevated/30 border border-surface-elevated rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Coins className="w-5 h-5 text-cyan" /> My Staked Positions
            </h2>

            {ids.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-foreground/50 border border-dashed border-surface-elevated rounded-xl">
                <Layers className="w-12 h-12 mb-3 text-surface-elevated" />
                <p>No active staked positions.</p>
                <p className="text-sm mt-1">Stake your ELN NFT to start earning!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {positions.map((pos: any) => (
                  <StakedNFTCard 
                    key={pos.positionId} 
                    pos={pos} 
                    handleClaim={handleClaim} 
                    handleUnstake={handleUnstake} 
                    isTxPending={isTxPending} 
                    nftName={nftName} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
