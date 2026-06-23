/**
 * RTX SMM Panel - Order History
 * Real-time order tracking with progress bars
 */

import React from 'react';
import { useApp } from '../context/AppContext';

interface OrderHistoryProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ isOpen, onToggle }) => {
  const { orders, hapticFeedback } = useApp();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Completed':
        return { 
          color: 'text-green-400 bg-green-500/10 border-green-500/30', 
          icon: '✅',
          progressColor: 'bg-green-500'
        };
      case 'Processing':
        return { 
          color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', 
          icon: '⚡',
          progressColor: 'bg-yellow-500'
        };
      case 'Queued':
        return { 
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', 
          icon: '⏳',
          progressColor: 'bg-blue-500'
        };
      case 'Failed':
        return { 
          color: 'text-red-400 bg-red-500/10 border-red-500/30', 
          icon: '❌',
          progressColor: 'bg-red-500'
        };
      default:
        return { 
          color: 'text-gray-400 bg-gray-500/10 border-gray-500/30', 
          icon: '❓',
          progressColor: 'bg-gray-500'
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

  const truncateLink = (link: string, maxLength: number = 35) => {
    if (link.length <= maxLength) return link;
    return link.substring(0, maxLength) + '...';
  };

  return (
    <div className="mx-4 mb-3">
      {/* Toggle Button */}
      <button
        onClick={() => {
          hapticFeedback('light');
          onToggle();
        }}
        className="w-full p-4 glass-dark border border-purple-500/40 rounded-xl text-left font-mono btn-cyber"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <span className="text-purple-400 font-semibold tracking-wide block">ORDER HISTORY</span>
              <span className="text-purple-600 text-xs">অর্ডার হিস্ট্রি</span>
            </div>
            {orders.length > 0 && (
              <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full ml-2">
                {orders.length}
              </span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-purple-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
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
        <div className="glass rounded-xl border-l-2 border-purple-500 p-4 max-h-[400px] overflow-y-auto animate-float-up">
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-6xl mb-4 block">📭</span>
              <p className="text-gray-500 font-mono text-sm">কোনো অর্ডার পাওয়া যায়নি</p>
              <p className="text-gray-600 font-mono text-xs mt-1">নতুন অর্ডার দিন!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order, index) => {
                const statusConfig = getStatusConfig(order.status);
                const progress = order.targetComments > 0 
                  ? (order.commentsDone / order.targetComments) * 100 
                  : 0;

                return (
                  <div
                    key={order.id}
                    className="bg-black/40 border border-gray-800 rounded-lg p-3 hover:border-purple-500/30 transition-all animate-float-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-gray-500 font-mono text-xs">
                        #{order.id.slice(-8).toUpperCase()}
                      </span>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded border ${statusConfig.color}`}>
                        {statusConfig.icon} {order.status}
                      </span>
                    </div>
                    
                    {/* Content */}
                    <div className="space-y-2">
                      <p className="text-purple-400/80 font-mono text-xs break-all">
                        🔗 {truncateLink(order.link)}
                      </p>
                      
                      {/* Progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 font-mono text-xs">
                            💬 {order.commentsDone}/{order.targetComments}
                          </span>
                          <span className="text-gray-500 font-mono text-xs">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 progress-bar-glow ${statusConfig.progressColor} ${
                              order.status === 'Processing' ? 'animate-progress-pulse' : ''
                            }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-gray-500 font-mono text-xs">
                          💵 {order.totalCost} BDT
                        </span>
                        <span className="text-gray-600 font-mono text-xs">
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
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

export default OrderHistory;
