/**
 * RTX SMM Panel - Type Definitions
 */

// Telegram Types
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface WebAppInitData {
  query_id?: string;
  user?: TelegramUser;
  auth_date: number;
  hash: string;
}

export interface HapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: WebAppInitData;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  HapticFeedback: HapticFeedback;
  ready: () => void;
  expand: () => void;
  close: () => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

// App State Types
export interface AppUser {
  id: string;
  username: string;
  balance: number;
  photoUrl?: string;
}

export interface Deposit {
  id: string;
  userId: string;
  username: string;
  userPhone: string;
  amount: number;
  txid: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  username: string;
  link: string;
  targetComments: number;
  commentsDone: number;
  totalCost: number;
  status: 'Processing' | 'Completed' | 'Failed' | 'Queued';
  createdAt: Date;
}

export interface SystemLog {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

export {};
