/**
 * RTX SMM Panel - Deposit System
 * Allows users to submit deposit requests
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

interface DepositSectionProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const DepositSection: React.FC<DepositSectionProps> = ({ isOpen, onToggle }) => {
  const { submitDeposit, isLoading, hapticFeedback, closeMiniApp } = useApp();
  
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [txid, setTxid] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async () => {
    setMessage(null);
    
    const amountNum = parseInt(amount);
    if (!amountNum || amountNum <= 0) {
      hapticFeedback('error');
      setMessage({ type: 'error', text: '❌ সঠিক টাকার পরিমাণ দিন!' });
      return;
    }
    if (!phone.trim() || phone.length < 11) {
      hapticFeedback('error');
      setMessage({ type: 'error', text: '❌ সঠিক ফোন নম্বর দিন!' });
      return;
    }
    if (!txid.trim()) {
      hapticFeedback('error');
      setMessage({ type: 'error', text: '❌ Transaction ID দিন!' });
      return;
    }

    setSubmitting(true);
    hapticFeedback('medium');

    const result = await submitDeposit(amountNum, phone.trim(), txid.trim());
    
    setSubmitting(false);

    if (result.success) {
      hapticFeedback('success');
      setMessage({ type: 'success', text: '📡 ডিপোজিট সাবমিট সফল! ৫ মিনিট থেকে ১ ঘন্টা ওয়েট করুন।' });
      setAmount('');
      setPhone('');
      setTxid('');
      
      setTimeout(() => {
        closeMiniApp();
      }, 2500);
    } else {
      hapticFeedback('error');
      setMessage({ type: 'error', text: result.error || '❌ ডিপোজিট ব্যর্থ!' });
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
        className="w-full p-4 glass-dark border border-green-500/40 rounded-xl text-left font-mono btn-cyber group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <span className="text-green-400 font-semibold tracking-wide block">DEPOSIT SYSTEM</span>
              <span className="text-green-600 text-xs">টাকা জমা দিন</span>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-green-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
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
        <div className="glass rounded-xl border-l-2 border-green-500 p-4 animate-float-up">
          {/* Payment Info */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
            <p className="text-yellow-400 text-sm font-mono text-center">
              🗣️ বিকাশ/নগদ পার্সোনাল: <span className="font-bold text-yellow-300">01725218874</span>
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 text-sm">৳</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="টাকার পরিমাণ (BDT)"
                className="w-full pl-8 pr-4 py-3 bg-black/60 border border-green-500/30 rounded-lg text-green-400 font-mono placeholder-green-700/50 focus:border-green-400 transition-colors"
              />
            </div>
            
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 text-sm">📱</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="আপনার বিকাশ/নগদ নম্বর"
                className="w-full pl-10 pr-4 py-3 bg-black/60 border border-green-500/30 rounded-lg text-green-400 font-mono placeholder-green-700/50 focus:border-green-400 transition-colors"
              />
            </div>
            
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 text-sm">🔑</span>
              <input
                type="text"
                value={txid}
                onChange={(e) => setTxid(e.target.value)}
                placeholder="Transaction ID (TxID)"
                className="w-full pl-10 pr-4 py-3 bg-black/60 border border-green-500/30 rounded-lg text-green-400 font-mono placeholder-green-700/50 focus:border-green-400 transition-colors"
              />
            </div>
          </div>

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
            disabled={submitting || isLoading}
            className="w-full mt-4 py-4 bg-gradient-to-r from-green-600 to-green-500 text-black font-mono font-bold rounded-lg 
                       hover:from-green-500 hover:to-green-400 disabled:from-green-900 disabled:to-green-800 disabled:text-green-950 
                       disabled:cursor-not-allowed transition-all duration-300 btn-cyber corner-brackets"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-rotate"></span>
                TRANSMITTING DATA...
              </span>
            ) : (
              'SUBMIT TRANSACTION'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepositSection;
