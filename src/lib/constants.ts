
import { Car, Bus } from 'lucide-react';

export const locations = [
  "ABUAD",
  "Abeokuta",
  "Ajah Lagos",
  "FESTAC Lagos",
  "Ibadan",
  "Iyana Paja Lagos",
  "Ojota Lagos"
];

export const vehicleOptions = {
    '4-seater': { name: '4-Seater Sienna', icon: Car, maxLuggages: 4 },
    '5-seater': { name: '5-Seater Sienna', icon: Car, maxLuggages: 2 },
    '7-seater': { name: '7-Seater Bus', icon: Bus, maxLuggages: 2 },
};

export const customerService = {
  phone: '2348104050628', // Your WhatsApp number with country code, no '+' or spaces
  email: 'tecotransit@gmail.com',
};

// Replace with your actual account details
export const bankAccountDetails = {
    bankName: "Fidelity Bank",
    accountName: "Ogundipe Toluwalase Cherish",
    accountNumber: "6173080473",
};

export const LUGGAGE_FARE = 0;
