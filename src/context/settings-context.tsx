
"use client";

import React, { createContext, useState, useEffect, useContext } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { DateRange } from 'react-day-picker';

interface SettingsContextType {
  isPaymentGatewayEnabled: boolean;
  bookingDateRange?: DateRange;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPaymentGatewayEnabled, setIsPaymentGatewayEnabled] = useState(true);
  const [bookingDateRange, setBookingDateRange] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const paymentSettingsDocRef = doc(db, "settings", "payment");
    const bookingSettingsDocRef = doc(db, "settings", "booking");

    const unsubPayment = onSnapshot(paymentSettingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsPaymentGatewayEnabled(docSnap.data().isPaymentGatewayEnabled);
      }
      setLoading(false); // Consider loading complete when primary setting is loaded
    }, (error) => {
      console.error("Failed to subscribe to payment settings:", error);
      setLoading(false);
    });
    
    const unsubBooking = onSnapshot(bookingSettingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const range: DateRange = {};
            if (data.startDate) range.from = data.startDate.toDate();
            if (data.endDate) range.to = data.endDate.toDate();
            setBookingDateRange(range);
        }
    }, (error) => {
        console.error("Failed to subscribe to booking settings:", error);
    });


    return () => {
        unsubPayment();
        unsubBooking();
    };
  }, []);

  const value = {
    isPaymentGatewayEnabled,
    bookingDateRange,
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
