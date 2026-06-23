/**
 * RTX SMM Panel - Footer Component
 * System status and version info
 */

import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mx-4 mt-6 mb-4">
      <div className="glass rounded-xl border border-gray-800 p-4">
        {/* Status Row */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-green-500 font-mono text-xs">SYSTEM ONLINE</span>
          </div>
          <div className="w-px h-4 bg-gray-700"></div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
            <span className="text-cyan-500 font-mono text-xs">BOT ACTIVE</span>
          </div>
        </div>

        {/* Version Info */}
        <div className="text-center">
          <p className="text-gray-500 font-mono text-xs">
            RTX SMM PANEL v3.3.2
          </p>
          <p className="text-gray-700 font-mono text-[10px] mt-1">
            Powered by Automation Engine | © 2024
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
