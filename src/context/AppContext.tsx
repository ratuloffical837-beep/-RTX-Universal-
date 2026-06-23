/**
 * RTX SMM Panel - Global Application Context
 * Real-time Firebase Firestore Integration with Telegram WebApp
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  ReactNode,
  useRef
} from 'react';
import { 
  createOrUpdateUser,
  createDeposit,
  createOrder,
  subscribeToUserBalance,
  subscribeToUserDeposits,
  subscribeToUserOrders,
  DepositDocument,
  OrderDocument
} from '../firebase';
import type { TelegramWebApp, TelegramUser, AppUser, Deposit, Order, SystemLog } from '../types';

// Context Types
interface AppContextType {
  // Telegram
  tg: TelegramWebApp | null;
  telegramUser: TelegramUser | null;
  
  // User Data
  user: AppUser | null;
  userId: string;
  username: string;
  avatarUrl: string;
  balance: number;
  
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Data
  deposits: Deposit[];
  orders: Order[];
  systemLogs: SystemLog[];
  
  // Actions
  submitDeposit: (amount: number, phone: string, txid: string) => Promise<{ success: boolean; error?: string }>;
  placeOrder: (link: string, targetComments: number) => Promise<{ success: boolean; error?: string; newBalance?: number }>;
  refreshData: () => void;
  
  // Telegram Actions
  closeMiniApp: () => void;
  openSupport: () => void;
  hapticFeedback: (type: 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy') => void;
  
  // Logs
  addSystemLog: (type: SystemLog['type'], message: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider Props
interface AppProviderProps {
  children: ReactNode;
}

// Demo/Fallback user for development outside Telegram
const DEMO_USER: TelegramUser = {
  id: 123456789,
  first_name: 'Demo',
  last_name: 'User',
  username: 'demo_user',
  photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rtx'
};

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Telegram State
  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  
  // User State
  const [user, setUser] = useState<AppUser | null>(null);
  const [balance, setBalance] = useState<number>(0);
  
  // App State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  
  // Refs for cleanup
  const unsubscribeRefs = useRef<Array<() => void>>([]);

  // Computed values
  const userId = telegramUser?.id?.toString() || 'demo_123456789';
  const username = telegramUser?.first_name || 'Demo User';
  const avatarUrl = telegramUser?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

  // Add System Log
  const addSystemLog = useCallback((type: SystemLog['type'], message: string) => {
    const log: SystemLog = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date()
    };
    setSystemLogs(prev => [log, ...prev].slice(0, 50));
  }, []);

  // Initialize Telegram WebApp
  useEffect(() => {
    const initTelegram = async () => {
      addSystemLog('info', 'INITIALIZING TELEGRAM INTERFACE...');
      
      try {
        const telegram = window.Telegram?.WebApp;
        
        if (telegram) {
          telegram.ready();
          telegram.expand();
          setTg(telegram);
          
          const tgUser = telegram.initDataUnsafe?.user;
          if (tgUser) {
            setTelegramUser(tgUser);
            addSystemLog('success', `USER AUTHENTICATED: ${tgUser.first_name}`);
          } else {
            // Fallback for testing
            setTelegramUser(DEMO_USER);
            addSystemLog('warning', 'DEMO MODE ACTIVATED');
          }
        } else {
          // Development fallback
          setTelegramUser(DEMO_USER);
          addSystemLog('warning', 'TELEGRAM SDK NOT FOUND - DEMO MODE');
        }
      } catch (err) {
        console.error('Telegram init error:', err);
        setTelegramUser(DEMO_USER);
        addSystemLog('error', 'TELEGRAM INIT FAILED - USING FALLBACK');
      }
    };

    initTelegram();
  }, [addSystemLog]);

  // Initialize Firebase User & Subscriptions
  useEffect(() => {
    if (!telegramUser) return;

    const initFirebase = async () => {
      addSystemLog('info', 'CONNECTING TO SECURE DATABASE...');
      setIsLoading(true);
      setError(null);

      try {
        const currentUserId = telegramUser.id.toString();
        
        // Create or update user in Firestore
        const userData = await createOrUpdateUser(
          currentUserId,
          telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : ''),
          telegramUser.photo_url
        );
        
        setUser({
          id: userData.id,
          username: userData.username,
          balance: userData.balance,
          photoUrl: userData.photoUrl
        });
        setBalance(userData.balance);
        addSystemLog('success', 'DATABASE CONNECTION ESTABLISHED');

        // Subscribe to real-time balance updates
        const unsubBalance = subscribeToUserBalance(
          currentUserId,
          (newBalance) => {
            setBalance(newBalance);
            addSystemLog('info', `BALANCE SYNCED: ${newBalance.toFixed(2)} BDT`);
          },
          (err) => {
            addSystemLog('error', `BALANCE SYNC ERROR: ${err.message}`);
          }
        );
        unsubscribeRefs.current.push(unsubBalance);

        // Subscribe to deposits
        const unsubDeposits = subscribeToUserDeposits(
          currentUserId,
          (depositDocs) => {
            const mappedDeposits: Deposit[] = depositDocs.map((d: DepositDocument) => ({
              id: d.id || '',
              userId: d.userId,
              username: d.username,
              userPhone: d.userPhone,
              amount: d.amount,
              txid: d.txid,
              status: d.status,
              createdAt: d.createdAt?.toDate() || new Date()
            }));
            setDeposits(mappedDeposits);
          }
        );
        unsubscribeRefs.current.push(unsubDeposits);

        // Subscribe to orders
        const unsubOrders = subscribeToUserOrders(
          currentUserId,
          (orderDocs) => {
            const mappedOrders: Order[] = orderDocs.map((o: OrderDocument) => ({
              id: o.id || '',
              userId: o.userId,
              username: o.username,
              link: o.link,
              targetComments: o.targetComments,
              commentsDone: o.commentsDone,
              totalCost: o.totalCost,
              status: o.status,
              createdAt: o.createdAt?.toDate() || new Date()
            }));
            setOrders(mappedOrders);
          }
        );
        unsubscribeRefs.current.push(unsubOrders);

        addSystemLog('success', 'ALL SYSTEMS OPERATIONAL');
        setIsInitialized(true);
        
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        addSystemLog('error', `INITIALIZATION FAILED: ${errorMsg}`);
      } finally {
        setIsLoading(false);
      }
    };

    initFirebase();

    // Cleanup subscriptions
    return () => {
      unsubscribeRefs.current.forEach(unsub => unsub());
      unsubscribeRefs.current = [];
    };
  }, [telegramUser, addSystemLog]);

  // Submit Deposit
  const submitDeposit = useCallback(async (
    amount: number, 
    phone: string, 
    txid: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!telegramUser) {
      return { success: false, error: 'User not authenticated' };
    }

    addSystemLog('info', `PROCESSING DEPOSIT: ${amount} BDT`);

    try {
      await createDeposit({
        userId: telegramUser.id.toString(),
        username: telegramUser.first_name,
        userPhone: phone.trim(),
        amount,
        txid: txid.trim()
      });

      addSystemLog('success', `DEPOSIT SUBMITTED: ${amount} BDT - TxID: ${txid}`);
      return { success: true };
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Deposit failed';
      addSystemLog('error', `DEPOSIT FAILED: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }, [telegramUser, addSystemLog]);

  // Place Order
  const placeOrder = useCallback(async (
    link: string,
    targetComments: number
  ): Promise<{ success: boolean; error?: string; newBalance?: number }> => {
    if (!telegramUser) {
      return { success: false, error: 'User not authenticated' };
    }

    addSystemLog('info', `INITIATING ORDER: ${targetComments} COMMENTS`);

    try {
      const result = await createOrder(
        telegramUser.id.toString(),
        telegramUser.first_name,
        link,
        targetComments
      );

      if (result.success) {
        addSystemLog('success', `ORDER CONFIRMED: ${targetComments} comments queued`);
        return { 
          success: true, 
          newBalance: result.newBalance 
        };
      } else {
        addSystemLog('error', `ORDER FAILED: ${result.error}`);
        return { success: false, error: result.error };
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Order failed';
      addSystemLog('error', `ORDER ERROR: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }, [telegramUser, addSystemLog]);

  // Refresh Data
  const refreshData = useCallback(() => {
    addSystemLog('info', 'REFRESHING DATA STREAMS...');
    // Real-time subscriptions handle this automatically
  }, [addSystemLog]);

  // Telegram Actions
  const closeMiniApp = useCallback(() => {
    if (tg) {
      tg.close();
    }
  }, [tg]);

  const openSupport = useCallback(() => {
    if (tg) {
      tg.openTelegramLink('https://t.me/Ratul');
    } else {
      window.open('https://t.me/Ratul', '_blank');
    }
  }, [tg]);

  const hapticFeedback = useCallback((type: 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy') => {
    if (!tg?.HapticFeedback) return;
    
    try {
      if (type === 'success' || type === 'error' || type === 'warning') {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    } catch (e) {
      // Haptic not available
    }
  }, [tg]);

  // Context Value
  const value: AppContextType = {
    tg,
    telegramUser,
    user,
    userId,
    username,
    avatarUrl,
    balance,
    isInitialized,
    isLoading,
    error,
    deposits,
    orders,
    systemLogs,
    submitDeposit,
    placeOrder,
    refreshData,
    closeMiniApp,
    openSupport,
    hapticFeedback,
    addSystemLog
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom Hook
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
