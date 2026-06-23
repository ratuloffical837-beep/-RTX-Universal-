/**
 * RTX SMM Panel - Balance Display Card
 * Cyberpunk-styled balance display with neon effects
 */

import React from 'react';
import { useApp } from '../context/AppContext';

export const BalanceCard: React.FC = () => {
  const { balance, isLoading, refreshData, hapticFeedback } = useApp();

  const handleRefresh = () => {
    hapticFeedback('light');
    refreshData();
  };

  return (
    <div className="relative mx-4 my-4">
      {/* Outer Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 via-cyan-500/10 to-green-500/20 rounded-xl blur-lg"></div>
      
      {/* Card Container */}
      <div className="relative glass rounded-xl border border-green-500/30 overflow-hidden corner-brackets animate-neon-pulse">
        {/* Scan Line Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-green-500/50 to-transparent animate-scan-line"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-green-500/20">
          <div className="flex items-center gap-2">
            <span className="text-green-500 text-sm">&gt;_</span>
            <span className="text-green-400/70 text-xs font-mono tracking-wider">WALLET_BALANCE</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-md hover:bg-green-500/10 transition-colors disabled:opacity-50"
            title="Sync Balance"
          >
            <svg
              className={`w-4 h-4 text-green-500 ${isLoading ? 'animate-rotate' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* Balance Display */}
        <div className="px-4 py-6 text-center">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 border-2 border-green-500/30 border-t-green-500 rounded-full animate-rotate"></div>
              <span className="text-green-500/70 font-mono text-lg">SYNCING...</span>
            </div>
          ) : (
            <>
              <div className="font-orbitron text-4xl md:text-5xl font-bold neon-text animate-text-glow tracking-wider">
                {balance.toFixed(2)}
              </div>
              <div className="mt-1 text-green-400/60 text-sm font-mono tracking-widest">
                BDT
              </div>
            </>
          )}
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-center gap-6 px-4 py-3 border-t border-green-500/20 bg-black/30">
          <div className="text-center">
            <span className="text-green-600 text-xs block">RATE</span>
            <span className="text-green-400 text-sm font-semibold">2 BDT/Comment</span>
          </div>
          <div className="w-px h-6 bg-green-500/30"></div>
          <div className="text-center">
            <span className="text-green-600 text-xs block">STATUS</span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-green-400 text-sm font-semibold">ONLINE</span>
            </div>
          </div>
        </div>

        {/* Decorative Corner Elements */}
        <div className="absolute top-3 right-3 flex gap-1">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></span>
          <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
        </div>
      </div>
    </div>
  );
};

export default BalanceCard;
