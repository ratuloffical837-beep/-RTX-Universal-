/**
 * RTX SMM Panel - Order Automation Section
 * Comment automation order placement
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

interface OrderSectionProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const OrderSection: React.FC<OrderSectionProps> = ({ isOpen, onToggle }) => {
  const { placeOrder, balance, isLoading, hapticFeedback, closeMiniApp } = useApp();
  
  const [link, setLink] = useState('');
  const [commentCount, setCommentCount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const COST_PER_COMMENT = 2;
  
  const totalCost = useMemo(() => {
    const count = parseInt(commentCount) || 0;
    return count * COST_PER_COMMENT;
  }, [commentCount]);

  const canAfford = balance >= totalCost && totalCost > 0;

  const handleSubmit = async () => {
    setMessage(null);

    if (!link.trim()) {
      hapticFeedback('error');
      setMessage({ type: 'error', text: '❌ ফেসবুক লিংক দিন!' });
      return;
    }
    
    const count = parseInt(commentCount);
    if (!count || count <= 0) {
      hapticFeedback('error');
      setMessage({ type: 'error', text: '❌ সঠিক কমেন্ট সংখ্যা দিন!' });
      return;
    }

    if (!canAfford) {
      hapticFeedback('error');
      setMessage({ type: 'error', text: `❌ পর্যাপ্ত ব্যালেন্স নেই! প্রয়োজন: ${totalCost} BDT` });
      return;
    }

    setSubmitting(true);
    hapticFeedback('medium');

    const result = await placeOrder(link.trim(), count);
    
    setSubmitting(false);

    if (result.success) {
      hapticFeedback('success');
      setMessage({ type: 'success', text: '🎉 অর্ডার গৃহীত! অটোমেশন ইঞ্জিন ৫ মিনিটে লাইভ হবে।' });
      setLink('');
      setCommentCount('');
      
      setTimeout(() => {
        closeMiniApp();
      }, 2500);
    } else {
      hapticFeedback('error');
      setMessage({ type: 'error', text: result.error || '❌ অর্ডার ব্যর্থ!' });
    }
  };

  return (
    <div className="mx-4 mb-3">
      {/* Toggle Button */}
      <button
        onClick={() => {
          hapticFeedback('light');
          onToggle();
        }}
        className="w-full p-4 glass-dark border border-cyan-500/40 rounded-xl text-left font-mono btn-cyber group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <span className="text-cyan-400 font-semibold tracking-wide block">COMMENT AUTOMATION</span>
              <span className="text-cyan-600 text-xs">অটো কমেন্ট সার্ভিস</span>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-cyan-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
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
          isOpen ? 'max-h-[700px] opacity-100 mt-2' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="glass rounded-xl border-l-2 border-cyan-500 p-4 animate-float-up">
          {/* Info Card */}
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 mb-4">
            <p className="neon-text-cyan text-sm font-mono text-center">
              💡 ১ কমেন্ট = <span className="font-bold">২ টাকা</span> | রিয়েল বাংলাদেশি কমেন্ট
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600 text-sm">🔗</span>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="ফেসবুক পোস্ট/ভিডিও লিংক"
                className="w-full pl-10 pr-4 py-3 bg-black/60 border border-cyan-500/30 rounded-lg text-cyan-400 font-mono placeholder-cyan-700/50 focus:border-cyan-400 transition-colors"
              />
            </div>
            
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600 text-sm">💬</span>
              <input
                type="number"
                value={commentCount}
                onChange={(e) => setCommentCount(e.target.value)}
                placeholder="কমেন্টের সংখ্যা"
                min="1"
                className="w-full pl-10 pr-4 py-3 bg-black/60 border border-cyan-500/30 rounded-lg text-cyan-400 font-mono placeholder-cyan-700/50 focus:border-cyan-400 transition-colors"
              />
            </div>
          </div>

          {/* Cost Calculator */}
          {commentCount && parseInt(commentCount) > 0 && (
            <div className="mt-4 p-4 bg-gray-900/50 border border-gray-700 rounded-lg animate-float-up">
              <div className="space-y-2">
                <div className="flex justify-between items-center font-mono text-sm">
                  <span className="text-gray-400">কমেন্ট সংখ্যা:</span>
                  <span className="text-cyan-400">{parseInt(commentCount) || 0}</span>
                </div>
                <div className="flex justify-between items-center font-mono text-sm">
                  <span className="text-gray-400">রেট:</span>
                  <span className="text-cyan-400">{COST_PER_COMMENT} BDT/each</span>
                </div>
                <div className="h-px bg-gray-700 my-2"></div>
                <div className="flex justify-between items-center font-mono">
                  <span className="text-gray-300 font-semibold">মোট খরচ:</span>
                  <span className={`text-lg font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                    {totalCost} BDT
                  </span>
                </div>
                <div className="flex justify-between items-center font-mono text-sm">
                  <span className="text-gray-400">আপনার ব্যালেন্স:</span>
                  <span className="text-green-400">{balance.toFixed(2)} BDT</span>
                </div>
                
                {!canAfford && totalCost > 0 && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-center">
                    <p className="text-red-400 text-xs font-mono">
                      ⚠️ আগে {(totalCost - balance).toFixed(2)} BDT ডিপোজিট করুন!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm font-mono text-center animate-float-up ${
                message.type === 'success'
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={submitting || isLoading || !canAfford}
            className="w-full mt-4 py-4 bg-gradient-to-r from-cyan-600 to-cyan-500 text-black font-mono font-bold rounded-lg 
                       hover:from-cyan-500 hover:to-cyan-400 disabled:from-gray-800 disabled:to-gray-700 disabled:text-gray-500 
                       disabled:cursor-not-allowed transition-all duration-300 btn-cyber"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-rotate"></span>
                PROCESSING ORDER...
              </span>
            ) : (
              'CONFIRM ORDER'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSection;
