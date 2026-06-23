/**
 * RTX SMM Panel - System Logs
 * Real-time terminal-style system logs
 */

import React from 'react';
import { useApp } from '../context/AppContext';

interface SystemLogsProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const SystemLogs: React.FC<SystemLogsProps> = ({ isOpen, onToggle }) => {
  const { systemLogs, hapticFeedback } = useApp();

  const getLogStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-cyan-400';
    }
  };

  const getLogPrefix = (type: string) => {
    switch (type) {
      case 'success':
        return '[✓]';
      case 'error':
        return '[✗]';
      case 'warning':
        return '[!]';
      default:
        return '[i]';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="mx-4 mb-3">
      {/* Toggle Button */}
      <button
        onClick={() => {
          hapticFeedback('light');
          onToggle();
        }}
        className="w-full p-4 glass-dark border border-gray-600/40 rounded-xl text-left font-mono btn-cyber"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🖥️</span>
            <div>
              <span className="text-gray-300 font-semibold tracking-wide block">SYSTEM LOGS</span>
              <span className="text-gray-500 text-xs">টার্মিনাল লগস</span>
            </div>
            {systemLogs.length > 0 && (
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2"></span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'max-h-[400px] opacity-100 mt-2' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-black/90 rounded-xl border border-gray-800 p-3 max-h-[300px] overflow-y-auto font-mono text-xs animate-float-up">
          {/* Terminal Header */}
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-gray-800">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
              <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
            </div>
            <span className="text-gray-500 text-[10px]">RTX_TERMINAL v3.3</span>
          </div>

          {/* Logs */}
          <div className="space-y-1">
            {systemLogs.length === 0 ? (
              <p className="text-gray-600">&gt; Waiting for system events...</p>
            ) : (
              systemLogs.map((log, index) => (
                <div
                  key={log.id}
                  className={`flex gap-2 ${getLogStyle(log.type)} animate-float-up`}
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <span className="text-gray-600 shrink-0">[{formatTime(log.timestamp)}]</span>
                  <span className="shrink-0">{getLogPrefix(log.type)}</span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
            
            {/* Cursor */}
            <div className="flex items-center gap-1 mt-2">
              <span className="text-gray-600">&gt;</span>
              <span className="text-green-500 animate-blink">▊</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemLogs;
