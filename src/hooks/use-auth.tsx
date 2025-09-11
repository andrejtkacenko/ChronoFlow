
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signOut, User, signInWithCustomToken } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  telegramId?: string;
  telegramUsername?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
  linkTelegramAccount: (telegramResponse: any) => Promise<void>;
  signInWithToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        // Listen for real-time updates on the user document
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserData);
          } else {
            // If doc doesn't exist, create it. This can happen on first login.
             const initialUserData: UserData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
            };
            setDoc(userRef, initialUserData, { merge: true });
            setUserData(initialUserData);
          }
        });

        setLoading(false);
        return () => unsubscribeFirestore(); // Cleanup Firestore listener

      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth(); // Cleanup auth listener
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const linkTelegramAccount = async (telegramResponse: any) => {
    if (!user) throw new Error("User not logged in.");

    const response = await fetch('/api/link-telegram', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid, telegramData: telegramResponse }),
    });

    if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to link Telegram account.');
    }
    
    // The onSnapshot listener will automatically update the UI
  }
  
  const signInWithToken = async (token: string) => {
    if (!token) {
      throw new Error("signInWithToken requires a token.");
    }
    await signInWithCustomToken(auth, token);
  };


  return (
    <AuthContext.Provider value={{ user, userData, loading, logout, linkTelegramAccount, signInWithToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
