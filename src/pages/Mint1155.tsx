import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { PUBLIC_MINTER_ADDRESS, PUBLIC_MINTER_ABI } from '../config/contracts';

const TIERS = [
  { id: 1, name: 'Bronze Tier', color: 'text-amber-600', bg: 'bg-amber-600/10', border: 'border-amber-600/30' },
  { id: 2, name: 'Silver Tier', color: 'text-slate-300', bg: 'bg-slate-300/10', border: 'border-slate-300/30' },
  { id: 3, name: 'Gold Tier', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  { id: 4, name: 'Platinum Tier', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' }
];

export function Mint1155() {
  const { isConnected } = useAccount();
  const [selectedTier, setSelectedTier] = useState<number | null>(null);

  const { writeContract, data: txHash, isPending: isWritePending, error: writeError, reset } = useWriteContract();
  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const isTxPending = isWritePending || isTxWaiting;

  const handleMint = (tierId: number) => {
    reset();
    setSelectedTier(tierId);
    writeContract({
      address: PUBLIC_MINTER_ADDRESS as `0x${string}`,
      abi: PUBLIC_MINTER_ABI,
      functionName: 'mint',
      args: [BigInt(tierId)],
    });
  };

  const parseError = (error: any) => {
    if (!error) return null;
    return error.shortMessage || error.message?.slice(0, 100) || 'Unknown error occurred';
  };

  const errorMsg = parseError(writeError);

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <div className="text-center p-10 bg-surface rounded-2xl max-w-md">
          <Sparkles className="w-16 h-16 text-foreground/50 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
          <p className="text-foreground/70">Connect your wallet to mint Stakyfi NFTs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-white mb-4">Mint Stakyfi NFTs</h1>
        <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
          Mint your Tier 1-4 Stakyfi NFTs to start earning rewards. Higher tiers yield higher staking multipliers!
        </p>
      </div>

      {isTxSuccess && (
        <div className="mb-8 p-4 max-w-3xl mx-auto rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-green-400">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <p className="font-bold">NFT Minted Successfully! You can now stake it in the Dashboard.</p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-8 p-4 max-w-3xl mx-auto rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 text-sm">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="break-words font-medium">{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {TIERS.map((tier) => (
          <div key={tier.id} className={`p-6 rounded-3xl border ${tier.border} ${tier.bg} backdrop-blur-sm flex flex-col items-center justify-between text-center transition-transform hover:-translate-y-1`}>
            <div>
              <div className="w-32 h-32 rounded-2xl mb-6 overflow-hidden border border-white/10 mx-auto shadow-2xl">
                <img src={`/assets/tiers/${tier.id}.jpg`} alt={tier.name} className="w-full h-full object-cover" />
              </div>
              <h3 className={`text-xl font-extrabold mb-2 ${tier.color}`}>{tier.name}</h3>
              <p className="text-sm text-foreground/70 mb-6">Free Mint (Limit 1 per tx)</p>
            </div>

            <button
              onClick={() => handleMint(tier.id)}
              disabled={isTxPending}
              className={`w-full py-3 rounded-xl font-bold transition-all text-white bg-surface-elevated hover:bg-white/10 border border-white/10 disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {isTxPending && selectedTier === tier.id ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Minting...</>
              ) : (
                'Mint Now'
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
