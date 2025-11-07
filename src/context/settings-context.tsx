
"use client";

import React, { createContext, useState, useEffect, useContext } from 'react';

interface SettingsContextType {
  isPaystackEnabled: boolean;
  setIsPaystackEnabled: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPaystackEnabled, setIsPaystackEnabled] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Ensure this runs only on the client
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem('isPaystackEnabled');
      if (storedValue !== null) {
        setIsPaystackEnabled(JSON.parse(storedValue));
      }
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    // Persist changes to localStorage, but only after initialization
    if (isInitialized && typeof window !== 'undefined') {
      localStorage.setItem('isPaystackEnabled', JSON.stringify(isPaystackEnabled));
    }
  }, [isPaystackEnabled, isInitialized]);

  const value = {
    isPaystackEnabled,
    setIsPaystackEnabled,
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
