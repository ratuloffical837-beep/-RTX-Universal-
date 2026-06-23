/**
 * RTX SMM Panel - Main Application
 * Cyberpunk-themed SMM automation panel
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import {
  UserProfile,
  BalanceCard,
  DepositSection,
  OrderSection,
  OrderHistory,
  DepositHistory,
  SupportButton,
  SystemLogs,
  LoadingScreen,
  Footer
} from './components';

type SectionType = 'deposit' | 'order' | 'orderHistory' | 'depositHistory' | 'logs' | null;

const MainApp: React.FC = () => {
  const { isInitialized, error } = useApp();
  const [activeSection, setActiveSection] = useState<SectionType>(null);
  const [showLoader, setShowLoader] = useState(true);

  const toggleSection = (section: SectionType) => {
    setActiveSection(prev => prev === section ? null : section);
  };

  const handleLoadComplete = () => {
    setTimeout(() => {
      setShowLoader(false);
    }, 300);
  };

  // Show error state
  if (error && !showLoader) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
        <div className="glass rounded-xl border border-red-500/30 p-6 max-w-md text-center">
          <span className="text-5xl mb-4 block">⚠️</span>
          <h2 className="text-red-400 font-orbitron text-xl mb-2">CONNECTION ERROR</h2>
          <p className="text-gray-400 font-mono text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 font-mono text-sm hover:bg-red-500/30 transition-colors"
          >
            RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Loading Screen */}
      {showLoader && <LoadingScreen onComplete={handleLoadComplete} />}

      {/* Main Content */}
      <div className={`min-h-screen bg-[#030712] transition-opacity duration-500 ${showLoader ? 'opacity-0' : 'opacity-100'}`}>
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Gradient Orbs */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
          
          {/* Scan Lines */}
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,65,0.02)_50%)] bg-[length:100%_4px] opacity-50"></div>
          
          {/* Moving Scan Line */}
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-green-500/30 to-transparent animate-scan-line"></div>
        </div>

        {/* Main Container */}
        <div className="relative z-10 max-w-lg mx-auto min-h-screen flex flex-col safe-area-inset">
          {/* Header */}
          <header className="sticky top-0 z-20 glass-dark border-b border-green-500/20">
            {/* App Title Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-green-500/10">
              <div className="flex items-center gap-2">
                <span className="text-green-500 text-lg">⚡</span>
                <span className="font-orbitron text-green-400 text-sm font-bold tracking-wider">RTX SMM</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-green-600 text-xs font-mono">LIVE</span>
              </div>
            </div>
            
            {/* User Profile */}
            <UserProfile />
          </header>

          {/* Content */}
          <main className="flex-1 py-2">
            {/* Balance Card */}
            <BalanceCard />

            {/* Action Sections */}
            <div className="space-y-2 mt-4">
              <DepositSection 
                isOpen={activeSection === 'deposit'} 
                onToggle={() => toggleSection('deposit')} 
              />
              
              <OrderSection 
                isOpen={activeSection === 'order'} 
                onToggle={() => toggleSection('order')} 
              />
              
              <OrderHistory 
                isOpen={activeSection === 'orderHistory'} 
                onToggle={() => toggleSection('orderHistory')} 
              />

              <DepositHistory 
                isOpen={activeSection === 'depositHistory'} 
                onToggle={() => toggleSection('depositHistory')} 
              />

              <SystemLogs 
                isOpen={activeSection === 'logs'} 
                onToggle={() => toggleSection('logs')} 
              />
            </div>

            {/* Support Button */}
            <SupportButton />
          </main>

          {/* Footer */}
          <Footer />
        </div>

        {/* Loading Overlay for Operations */}
        {isInitialized && (
          <div id="loading-overlay" className="hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 items-center justify-center">
            <div className="glass rounded-xl border border-green-500/30 p-6 flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-rotate mb-4"></div>
              <span className="text-green-400 font-mono text-sm">Processing...</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

export default App;
