/**
 * RTX SMM Panel - Firebase Configuration
 * Production-grade Firestore integration with type safety
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
  DocumentReference,
  CollectionReference
} from 'firebase/firestore';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFhx3WcKgytx1Saw9zfPq4dkblcoIeTBU",
  authDomain: "rtx-smm-pnayel.firebaseapp.com",
  projectId: "rtx-smm-pnayel",
  storageBucket: "rtx-smm-pnayel.firebasestorage.app",
  messagingSenderId: "790579613454",
  appId: "1:790579613454:web:e8e0e7d5ae8f570ad9915f"
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log('[Firebase] ✅ Infrastructure synced successfully');
} catch (error) {
  console.error('[Firebase] ❌ Initialization failed:', error);
  throw error;
}

// Type Definitions
export interface UserDocument {
  id: string;
  username: string;
  balance: number;
  photoUrl?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface DepositDocument {
  id?: string;
  userId: string;
  username: string;
  userPhone: string;
  amount: number;
  txid: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  processedAt?: Timestamp;
}

export interface OrderDocument {
  id?: string;
  userId: string;
  username: string;
  link: string;
  targetComments: number;
  commentsDone: number;
  totalCost: number;
  status: 'Processing' | 'Completed' | 'Failed' | 'Queued';
  createdAt: Timestamp;
  completedAt?: Timestamp;
  errorMessage?: string;
}

export interface FBAccountDocument {
  id?: string;
  phone: string;
  name: string;
  cookies: string;
  status: 'Active' | 'Dead' | 'Checkpoint' | 'PendingLogin' | 'Cooldown';
  totalCommentsDone: number;
  lastUsed: Timestamp;
  addedAt: Timestamp;
  errorCount: number;
}

export interface CommentDocument {
  id?: string;
  text: string;
  category?: string;
  createdAt: Timestamp;
}

// Collection Names
export const Collections = {
  users: 'users',
  deposits: 'deposits',
  orders: 'orders',
  fb_accounts: 'fb_accounts',
  comments_pool: 'comments_pool',
  system_logs: 'system_logs'
} as const;

// Helper Functions
export const getCollection = (collectionName: string): CollectionReference => {
  return collection(db, collectionName);
};

export const getDocRef = (collectionName: string, docId: string): DocumentReference => {
  return doc(db, collectionName, docId);
};

// User Operations
export const getUserById = async (userId: string): Promise<UserDocument | null> => {
  try {
    const userRef = doc(db, Collections.users, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as UserDocument;
    }
    return null;
  } catch (error) {
    console.error('[Firebase] getUserById error:', error);
    throw error;
  }
};

export const createOrUpdateUser = async (
  userId: string, 
  username: string, 
  photoUrl?: string
): Promise<UserDocument> => {
  try {
    const userRef = doc(db, Collections.users, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      await updateDoc(userRef, {
        username,
        photoUrl,
        updatedAt: serverTimestamp()
      });
      const updated = await getDoc(userRef);
      return { id: updated.id, ...updated.data() } as UserDocument;
    } else {
      const newUser: Omit<UserDocument, 'id'> = {
        username,
        balance: 0,
        photoUrl,
        createdAt: Timestamp.now()
      };
      await setDoc(userRef, newUser);
      return { id: userId, ...newUser };
    }
  } catch (error) {
    console.error('[Firebase] createOrUpdateUser error:', error);
    throw error;
  }
};

// Deposit Operations
export const createDeposit = async (deposit: Omit<DepositDocument, 'id' | 'createdAt' | 'status'>): Promise<string> => {
  try {
    const depositsRef = collection(db, Collections.deposits);
    const newDeposit: Omit<DepositDocument, 'id'> = {
      ...deposit,
      status: 'pending',
      createdAt: Timestamp.now()
    };
    const docRef = await addDoc(depositsRef, newDeposit);
    console.log('[Firebase] Deposit created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[Firebase] createDeposit error:', error);
    throw error;
  }
};

// Order Operations with Transaction
export const createOrder = async (
  userId: string,
  username: string,
  link: string,
  targetComments: number,
  costPerComment: number = 2
): Promise<{ success: boolean; orderId?: string; newBalance?: number; error?: string }> => {
  const totalCost = targetComments * costPerComment;
  
  try {
    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, Collections.users, userId);
      const userSnap = await transaction.get(userRef);
      
      if (!userSnap.exists()) {
        throw new Error('USER_NOT_FOUND');
      }
      
      const userData = userSnap.data() as UserDocument;
      const currentBalance = userData.balance || 0;
      
      if (currentBalance < totalCost) {
        throw new Error('INSUFFICIENT_BALANCE');
      }
      
      const newBalance = currentBalance - totalCost;
      transaction.update(userRef, { 
        balance: newBalance,
        updatedAt: serverTimestamp()
      });
      
      const ordersRef = collection(db, Collections.orders);
      const orderRef = doc(ordersRef);
      const newOrder: Omit<OrderDocument, 'id'> = {
        userId,
        username,
        link: link.trim(),
        targetComments,
        commentsDone: 0,
        totalCost,
        status: 'Queued',
        createdAt: Timestamp.now()
      };
      transaction.set(orderRef, newOrder);
      
      return { orderId: orderRef.id, newBalance };
    });
    
    console.log('[Firebase] Order created successfully:', result.orderId);
    return { success: true, ...result };
    
  } catch (error: unknown) {
    console.error('[Firebase] createOrder error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'USER_NOT_FOUND') {
      return { success: false, error: 'ইউজার অ্যাকাউন্ট পাওয়া যায়নি!' };
    }
    if (errorMessage === 'INSUFFICIENT_BALANCE') {
      return { success: false, error: 'পর্যাপ্ত ব্যালেন্স নেই!' };
    }
    return { success: false, error: errorMessage || 'অর্ডার তৈরি করতে ব্যর্থ' };
  }
};

// Real-time Listeners
export const subscribeToUserBalance = (
  userId: string, 
  callback: (balance: number) => void,
  errorCallback?: (error: Error) => void
) => {
  const userRef = doc(db, Collections.users, userId);
  
  return onSnapshot(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserDocument;
        callback(data.balance || 0);
      } else {
        callback(0);
      }
    },
    (error) => {
      console.error('[Firebase] Balance subscription error:', error);
      errorCallback?.(error);
    }
  );
};

export const subscribeToUserDeposits = (
  userId: string,
  callback: (deposits: DepositDocument[]) => void,
  limitCount: number = 20
) => {
  const depositsRef = collection(db, Collections.deposits);
  const q = query(
    depositsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  return onSnapshot(q, (snapshot) => {
    const deposits: DepositDocument[] = [];
    snapshot.forEach((doc) => {
      deposits.push({ id: doc.id, ...doc.data() } as DepositDocument);
    });
    callback(deposits);
  });
};

export const subscribeToUserOrders = (
  userId: string,
  callback: (orders: OrderDocument[]) => void,
  limitCount: number = 20
) => {
  const ordersRef = collection(db, Collections.orders);
  const q = query(
    ordersRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  return onSnapshot(q, (snapshot) => {
    const orders: OrderDocument[] = [];
    snapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as OrderDocument);
    });
    callback(orders);
  });
};

export { db, serverTimestamp, Timestamp, onSnapshot, query, where, orderBy, limit };
export default db;
