/**
 * RTX SMM Panel - Deposit History
 * Real-time deposit tracking with status indicators
 */

import React from 'react';
import { useApp } from '../context/AppContext';

interface DepositHistoryProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const DepositHistory: React.FC<DepositHistoryProps> = ({ isOpen, onToggle }) => {
  const { deposits, hapticFeedback } = useApp();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { 
          color: 'text-green-400 bg-green-500/10 border-green-500/30', 
          icon: '✅',
          label: 'Approved'
        };
      case 'pending':
        return { 
          color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', 
          icon: '⏳',
          label: 'Pending'
        };
      case 'rejected':
        return { 
          color: 'text-red-400 bg-red-500/10 border-red-500/30', 
          icon: '❌',
          label: 'Rejected'
        };
      default:
        return { 
          color: 'text-gray-400 bg-gray-500/10 border-gray-500/30', 
          icon: '❓',
          label: status
        };
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('bn-BD', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="mx-4 mb-3">
      {/* Toggle Button */}
      <button
        onClick={() => {
          hapticFeedback('light');
          onToggle();
        }}
        className="w-full p-4 glass-dark border border-orange-500/40 rounded-xl text-left font-mono btn-cyber"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💸</span>
            <div>
              <span className="neon-text-orange font-semibold tracking-wide block">DEPOSIT HISTORY</span>
              <span className="text-orange-600 text-xs">ডিপোজিট হিস্ট্রি</span>
            </div>
            {deposits.length > 0 && (
              <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full ml-2">
                {deposits.length}
              </span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-orange-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
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
          isOpen ? 'max-h-[600px] opacity-100 mt-2' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="glass rounded-xl border-l-2 border-orange-500 p-4 max-h-[400px] overflow-y-auto animate-float-up">
          {deposits.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-6xl mb-4 block">💳</span>
              <p className="text-gray-500 font-mono text-sm">কোনো ডিপোজিট পাওয়া যায়নি</p>
              <p className="text-gray-600 font-mono text-xs mt-1">ডিপোজিট করুন!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deposits.map((deposit, index) => {
                const statusConfig = getStatusConfig(deposit.status);

                return (
                  <div
                    key={deposit.id}
                    className="bg-black/40 border border-gray-800 rounded-lg p-3 hover:border-orange-500/30 transition-all animate-float-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-gray-500 font-mono text-xs">
                        #{deposit.id.slice(-8).toUpperCase()}
                      </span>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded border ${statusConfig.color}`}>
                        {statusConfig.icon} {statusConfig.label}
                      </span>
                    </div>
                    
                    {/* Content */}
                    <div className="space-y-1.5">
                      {/* Amount */}
                      <div className="flex items-center justify-between">
                        <span className="neon-text-orange font-orbitron text-xl font-bold">
                          {deposit.amount} BDT
                        </span>
                      </div>
                      
                      {/* Phone */}
                      <p className="text-gray-400 font-mono text-xs">
                        📱 {deposit.userPhone}
                      </p>
                      
                      {/* TxID */}
                      <p className="text-gray-500 font-mono text-xs break-all">
                        🔑 TxID: {deposit.txid}
                      </p>

                      {/* Date */}
                      <p className="text-gray-600 font-mono text-xs pt-1">
                        📅 {formatDate(deposit.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepositHistory;
