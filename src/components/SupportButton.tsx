/**
 * RTX SMM Panel - Support Button
 * Contact admin/operator button
 */

import React from 'react';
import { useApp } from '../context/AppContext';

export const SupportButton: React.FC = () => {
  const { openSupport, hapticFeedback } = useApp();

  const handleClick = () => {
    hapticFeedback('medium');
    openSupport();
  };

  return (
    <div className="mx-4 my-4">
      <button
        onClick={handleClick}
        className="w-full p-4 glass-dark border border-pink-500/40 rounded-xl font-mono btn-cyber group hover:border-pink-400 transition-all"
      >
        <div className="flex items-center justify-center gap-3">
          <span className="text-2xl group-hover:animate-bounce transition-transform">💬</span>
          <span className="text-pink-400 font-semibold tracking-wide">
            CONTACT OPERATOR
          </span>
        </div>
        <p className="text-pink-600 text-xs mt-1 text-center">24/7 সাপোর্ট</p>
      </button>
    </div>
  );
};

export default SupportButton;
