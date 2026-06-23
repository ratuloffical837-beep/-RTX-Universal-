/**
 * RTX SMM Panel - Cyberpunk Loading Screen
 * Sequential boot-up animation with terminal logs
 */

import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onComplete?: () => void;
}

const BOOT_SEQUENCE = [
  { delay: 0, text: 'INITIALIZING RTX SMM PANEL v3.3...', type: 'info' },
  { delay: 400, text: 'CONNECTING TO SECURE NODE...', type: 'info' },
  { delay: 800, text: 'LOADING ENCRYPTION PROTOCOLS...', type: 'info' },
  { delay: 1200, text: 'DATABASE CONNECTION: ESTABLISHING...', type: 'warning' },
  { delay: 1600, text: 'DATABASE CONNECTION: SUCCESS', type: 'success' },
  { delay: 2000, text: 'LOADING USER INTERFACE...', type: 'info' },
  { delay: 2400, text: 'AUTOMATION ENGINE: STANDBY', type: 'success' },
  { delay: 2800, text: 'SYSTEM READY.', type: 'success' },
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [visibleLogs, setVisibleLogs] = useState<number>(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    BOOT_SEQUENCE.forEach((log, index) => {
      setTimeout(() => {
        setVisibleLogs(index + 1);
        
        if (index === BOOT_SEQUENCE.length - 1) {
          setTimeout(() => {
            setIsComplete(true);
            onComplete?.();
          }, 800);
        }
      }, log.delay);
    });
  }, [onComplete]);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-cyan-400';
    }
  };

  const getLogPrefix = (type: string) => {
    switch (type) {
      case 'success':
        return '[✓]';
      case 'warning':
        return '[!]';
      case 'error':
        return '[✗]';
      default:
        return '[>]';
    }
  };

  return (
    <div className={`fixed inset-0 bg-[#030712] z-50 flex flex-col items-center justify-center p-6 transition-opacity duration-500 ${isComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Scan Lines Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,65,0.05)_50%)] bg-[length:100%_4px]"></div>
        <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-green-500/50 to-transparent animate-scan-line"></div>
      </div>

      {/* Logo */}
      <div className="relative mb-8">
        <div className="absolute -inset-4 bg-green-500/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="relative">
          <h1 className="font-orbitron text-3xl md:text-4xl font-bold neon-text animate-text-glow tracking-wider">
            RTX SMM
          </h1>
          <p className="text-center text-green-600 font-mono text-xs mt-1 tracking-widest">
            AUTOMATION TERMINAL
          </p>
        </div>
      </div>

      {/* Loading Spinner */}
      <div className="relative w-20 h-20 mb-8">
        {/* Outer Ring */}
        <div className="absolute inset-0 border-4 border-green-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-green-500 rounded-full animate-rotate"></div>
        
        {/* Inner Ring */}
        <div className="absolute inset-2 border-2 border-green-500/10 rounded-full"></div>
        <div className="absolute inset-2 border-2 border-transparent border-b-cyan-500 rounded-full animate-rotate" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        
        {/* Center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-green-500 text-2xl animate-pulse">⚡</span>
        </div>
      </div>

      {/* Terminal Logs */}
      <div className="w-full max-w-md bg-black/80 rounded-xl border border-green-500/30 p-4 font-mono text-sm">
        {/* Terminal Header */}
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-green-500/20">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
            <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
          </div>
          <span className="text-green-600 text-xs">boot_sequence.sh</span>
        </div>

        {/* Logs */}
        <div className="space-y-1.5 min-h-[180px]">
          {BOOT_SEQUENCE.slice(0, visibleLogs).map((log, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 ${getLogColor(log.type)} animate-float-up`}
            >
              <span className="shrink-0">{getLogPrefix(log.type)}</span>
              <span>{log.text}</span>
            </div>
          ))}
          
          {/* Cursor */}
          {!isComplete && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-green-600">&gt;</span>
              <span className="text-green-500 animate-blink">▊</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-md mt-6">
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-600 to-cyan-500 rounded-full transition-all duration-500 progress-bar-glow"
            style={{ width: `${(visibleLogs / BOOT_SEQUENCE.length) * 100}%` }}
          ></div>
        </div>
        <p className="text-center text-green-700 text-xs mt-2 font-mono">
          {Math.round((visibleLogs / BOOT_SEQUENCE.length) * 100)}% COMPLETE
        </p>
      </div>

      {/* Version */}
      <p className="absolute bottom-4 text-gray-700 text-xs font-mono">
        RTX SMM PANEL © 2024 | v3.3.2
      </p>
    </div>
  );
};

export default LoadingScreen;
