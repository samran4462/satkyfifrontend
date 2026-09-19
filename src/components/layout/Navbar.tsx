import { Layers } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link } from 'react-router-dom';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-elevated bg-obsidian/80 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric/20 text-electric shadow-[0_0_15px_rgba(124,58,237,0.5)]">
              <Layers className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Nexus<span className="text-cyan">Stake</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/dashboard" className="text-foreground/80 hover:text-cyan transition-colors">Explore NFTs</Link>
            <Link to="/mint" className="text-foreground/80 hover:text-cyan transition-colors">Mint Tiers</Link>
            <Link to="/mystaking" className="text-foreground/80 hover:text-cyan transition-colors">My Staking</Link>
            <Link to="/rewards" className="text-foreground/80 hover:text-cyan transition-colors">Rewards</Link>
            <Link to="/staking721" className="text-foreground/80 hover:text-cyan transition-colors">ERC-721 Staking</Link>
            <Link to="/admin" className="text-foreground/80 hover:text-cyan transition-colors">Admin</Link>
          </nav>

          <div className="flex items-center gap-4">
            <ConnectButton showBalance={true} chainStatus="icon" />
          </div>
          
        </div>
      </div>
    </header>
  );
}
