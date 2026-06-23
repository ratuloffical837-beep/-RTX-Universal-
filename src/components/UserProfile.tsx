/**
 * RTX SMM Panel - User Profile Header
 * Displays authenticated user info with terminal styling
 */

import React from 'react';
import { useApp } from '../context/AppContext';

export const UserProfile: React.FC = () => {
  const { username, avatarUrl, userId, isInitialized } = useApp();

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-green-500/20 bg-black/40">
      {/* Avatar */}
      <div className="relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-cyan-500 rounded-full blur opacity-40 animate-pulse"></div>
        <img
          src={avatarUrl}
          alt="Avatar"
          className="relative w-10 h-10 rounded-full border-2 border-green-500/50 object-cover bg-gray-900"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
          }}
        />
        {/* Status Indicator */}
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${
          isInitialized ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
        }`}></span>
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-mono text-sm font-semibold truncate">
            {username.toUpperCase()}
          </span>
          <span className="text-green-600 text-xs">@SYS</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-green-700 text-xs font-mono">ID:</span>
          <span className="text-green-500/70 text-xs font-mono truncate">{userId.slice(0, 12)}...</span>
        </div>
      </div>

      {/* Terminal Cursor */}
      <div className="flex items-center">
        <span className="text-green-500 text-lg animate-blink">▊</span>
      </div>
    </div>
  );
};

export default UserProfile;
