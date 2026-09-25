import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

function EnergyCore({ isHovered, color }: { isHovered: boolean, color: string }) {
  const meshRef = useRef<any>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += isHovered ? delta * 2 : delta * 0.5;
      meshRef.current.rotation.y += isHovered ? delta * 2 : delta * 0.5;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1.5, 64, 64]} scale={isHovered ? 1.2 : 1}>
      <MeshDistortMaterial
        color={color}
        envMapIntensity={1}
        clearcoat={1}
        clearcoatRoughness={0.1}
        metalness={0.8}
        roughness={0.2}
        distort={isHovered ? 0.6 : 0.3}
        speed={isHovered ? 4 : 2}
        emissive={color}
        emissiveIntensity={isHovered ? 2 : 0.5}
      />
    </Sphere>
  );
}

interface Tier {
  id: number;
  name: string;
  color: string;
  bg: string;
  border: string;
}

interface TierCardProps {
  tier: Tier;
  onMint: (id: number) => void;
  isPending: boolean;
  isSelected: boolean;
}

export function TierCard({ tier, onMint, isPending, isSelected }: TierCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const tierColors: Record<number, string> = {
    1: '#d97706', // amber-600
    2: '#cbd5e1', // slate-300
    3: '#facc15', // yellow-400
    4: '#22d3ee', // cyan-400
  };
  const coreColor = tierColors[tier.id] || '#ffffff';

  return (
    <motion.div
      initial={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative p-6 rounded-3xl border border-white/20 bg-white/5 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex flex-col items-center justify-between text-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none rounded-3xl" />
      
      <div className="w-full relative z-10">
        <div className="w-32 h-32 mb-6 mx-auto relative rounded-full overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          <Canvas camera={{ position: [0, 0, 4] }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 10]} intensity={1} />
            <EnergyCore isHovered={isHovered} color={coreColor} />
          </Canvas>
        </div>
        
        <h3 className={`text-2xl font-extrabold mb-2 ${tier.color}`} style={{ textShadow: `0 0 10px ${coreColor}80` }}>
          {tier.name}
        </h3>
        
        <div className="mb-4 p-3 bg-black/30 rounded-xl border border-white/10">
          <p className="text-sm text-foreground/70 mb-1">Reward Rate</p>
          <p className="text-lg font-bold text-yellow-400" style={{ textShadow: '0 0 8px rgba(250,204,21,0.6)' }}>
            {tier.id * 10} AURA/Day
          </p>
        </div>
        
        <p className="text-sm text-foreground/70 mb-6">Free Mint (Limit 1 per tx)</p>
      </div>

      <button
        onClick={() => onMint(tier.id)}
        disabled={isPending}
        className="w-full py-3 rounded-xl font-bold transition-all text-white bg-surface-elevated hover:bg-white/10 border border-white/10 disabled:opacity-50 flex items-center justify-center gap-2 relative z-10"
      >
        {isPending && isSelected ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Minting...</>
        ) : (
          'Mint Now'
        )}
      </button>
    </motion.div>
  );
}
