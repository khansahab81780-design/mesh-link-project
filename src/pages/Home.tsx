/**
 * Home.tsx — MeshLink Welcome / Landing Page
 *
 * Full-screen landing with animated grid background, mode badges,
 * and CTAs to enter the mesh or read about how it works.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Network,
  ArrowRight,
  Info,
  Zap,
  Bluetooth,
  AlertTriangle,
  Radio,
  Shield,
  Cpu,
} from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-gray-950 flex flex-col items-center justify-center overflow-hidden">
      {/* ── Animated grid background ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(6,182,212,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── Radial glow ── */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      {/* ── Floating dot nodes (decorative) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[
          { top: '15%', left: '10%' },
          { top: '25%', left: '85%' },
          { top: '65%', left: '8%' },
          { top: '70%', left: '90%' },
          { top: '45%', left: '5%' },
          { top: '40%', left: '95%' },
          { top: '85%', left: '50%' },
          { top: '10%', left: '55%' },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-cyan-500/40 animate-pulse"
            style={{ top: pos.top, left: pos.left, animationDelay: `${i * 0.4}s` }}
          />
        ))}
        {/* Connector lines (SVG) */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
          <line x1="10%" y1="15%" x2="55%" y2="10%" stroke="#06b6d4" strokeWidth="1" />
          <line x1="55%" y1="10%" x2="85%" y2="25%" stroke="#06b6d4" strokeWidth="1" />
          <line x1="85%" y1="25%" x2="90%" y2="70%" stroke="#06b6d4" strokeWidth="1" />
          <line x1="10%" y1="15%" x2="8%" y2="65%" stroke="#06b6d4" strokeWidth="1" />
          <line x1="8%" y1="65%" x2="50%" y2="85%" stroke="#06b6d4" strokeWidth="1" />
          <line x1="50%" y1="85%" x2="90%" y2="70%" stroke="#06b6d4" strokeWidth="1" />
          <line x1="5%" y1="45%" x2="8%" y2="65%" stroke="#06b6d4" strokeWidth="1" />
          <line x1="55%" y1="10%" x2="5%" y2="45%" stroke="#06b6d4" strokeWidth="1" />
        </svg>
      </div>

      {/* ── Main content ── */}
      <main className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl mx-auto">

        {/* Logo */}
        <div className="mb-6 relative">
          <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Network className="w-10 h-10 text-cyan-400" />
          </div>
          {/* Ping ring */}
          <span className="absolute -inset-1 rounded-2xl border border-cyan-500/20 animate-ping" />
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-3">
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            MeshLink
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-xl sm:text-2xl font-semibold text-gray-100 mb-4">
          Communicate when the Internet can't.
        </p>

        {/* Description */}
        <p className="text-gray-400 text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
          MeshLink creates a <span className="text-cyan-400 font-medium">peer-to-peer Bluetooth relay network</span> that
          routes messages across multiple devices — no WiFi, no cellular, no central servers.
          Messages hop from device to device until they reach their destination, even in
          disaster zones, remote areas, or censored environments.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {[
            { icon: Radio, label: 'Store & Forward' },
            { icon: Shield, label: 'End-to-End Encrypted' },
            { icon: Cpu, label: 'No Infrastructure' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm"
            >
              <Icon className="w-3.5 h-3.5 text-cyan-400" />
              {label}
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-10">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-gray-950 font-bold text-lg transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
          >
            Enter Mesh
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/about')}
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-cyan-500/50 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 font-semibold text-lg transition-all duration-200 hover:-translate-y-0.5"
          >
            <Info className="w-5 h-5" />
            How It Works
          </button>
        </div>

        {/* Mode badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-semibold tracking-wide">
            <Zap className="w-3 h-3" />
            SIMULATION MODE ACTIVE
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold tracking-wide">
            <Bluetooth className="w-3 h-3" />
            WEB BLUETOOTH: EXPERIMENTAL
          </span>
        </div>

        {/* Disclaimer */}
        <p className="flex items-start gap-2 text-gray-500 text-xs leading-relaxed max-w-md">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-500/70 mt-0.5 shrink-0" />
          Web Bluetooth is only available in Chrome / Edge on desktop and Android. It cannot
          run in the background and cannot be discovered by other devices without a native
          companion app. Full mesh capability requires the MeshLink native app.
        </p>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 mt-8 pb-6 text-center text-gray-600 text-xs">
        MeshLink v0.1.0 · Peer-to-Peer Mesh Relay
      </footer>
    </div>
  );
};

export default Home;
