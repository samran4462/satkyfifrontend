import { ArrowRight, ShieldCheck, Zap, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 w-full -translate-x-1/2 h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-electric/20 blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-cyan/10 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center max-w-3xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-elevated border border-surface text-sm font-medium text-cyan">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan"></span>
            </span>
            Sepolia Testnet Live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
            Unlock the Power of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric to-cyan">
              NFT Staking
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-foreground/70 max-w-2xl mx-auto">
            Stake your exclusive digital assets to earn high-yield STAKY rewards. Featuring time-based loyalty multipliers, secure architecture, and zero compromise on safety.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/dashboard" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-electric text-white font-bold text-lg shadow-[0_0_30px_rgba(124,58,237,0.3)] transition-all hover:bg-bright-violet hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] flex items-center justify-center gap-2">
              Start Staking <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-surface-elevated text-white font-bold text-lg border border-surface transition-all hover:bg-navy flex items-center justify-center gap-2">
              View Contracts
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-6 rounded-2xl bg-surface-elevated/50 border border-surface backdrop-blur-sm">
            <div className="w-12 h-12 rounded-lg bg-electric/20 flex items-center justify-center mb-4 text-electric">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">100% Non-Custodial</h3>
            <p className="text-foreground/70">Your NFTs remain secure. Unstake at any time with transparent early-unstake penalties.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-surface-elevated/50 border border-surface backdrop-blur-sm">
            <div className="w-12 h-12 rounded-lg bg-cyan/20 flex items-center justify-center mb-4 text-cyan">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Loyalty Multipliers</h3>
            <p className="text-foreground/70">Earn up to 2.0x bonus yields automatically by locking your NFTs for longer durations.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-surface-elevated/50 border border-surface backdrop-blur-sm">
            <div className="w-12 h-12 rounded-lg bg-bright-violet/20 flex items-center justify-center mb-4 text-bright-violet">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Real-Time Yield</h3>
            <p className="text-foreground/70">Watch your rewards accumulate block-by-block. Claim seamlessly without unstaking.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
