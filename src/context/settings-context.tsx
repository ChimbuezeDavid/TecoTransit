
"use client";

import React, { createContext, useState, useEffect, useContext } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface SettingsContextType {
  isPaystackEnabled: boolean;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPaystackEnabled, setIsPaystackEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const settingsDocRef = doc(db, "settings", "payment");
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsPaystackEnabled(docSnap.data().isPaystackEnabled);
      }
      setLoading(false);
    }, (error) => {
      console.error("Failed to subscribe to settings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    isPaystackEnabled,
    loading,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
