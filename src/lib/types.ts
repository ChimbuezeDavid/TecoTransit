

import { DateRange } from "react-day-picker";

export type Booking = {
  id: string; // Firestore's auto-generated document ID
  name: string;
  email: string;
  phone: string;
  pickup: string;
  destination: string;
  intendedDate: string; // Stored as 'yyyy-MM-dd'
  vehicleType: string;
  luggageCount: number;
  totalFare: number;
  allowReschedule: boolean;
  paymentReference?: string; // Paystack transaction reference
  status: 'Pending' | 'Paid' | 'Confirmed' | 'Cancelled' | 'Refunded';
  createdAt: number; // Stored as Firestore Timestamp, but millis in UI
  confirmedDate?: string; // Stored as 'yyyy-MM-dd'
  tripId?: string; // ID of the trip this booking is assigned to
  rescheduledCount?: number; // Tracks how many times a booking has been auto-rescheduled
};

export type Passenger = {
    bookingId: string;
    name: string;
    phone: string;
};

export type Trip = {
    id: string; // e.g. abuad-ajah-lagos_4-seater-sienna_2024-09-21_1
    priceRuleId: string;
    pickup: string;
    destination: string;
    vehicleType: string;
    date: string; // 'yyyy-MM-dd'
    vehicleIndex: number; // 1, 2, 3...
    capacity: number;
    passengers: Passenger[];
    isFull: boolean;
};

export type BookingFormData = Omit<Booking, 'id' | 'status' | 'createdAt' | 'tripId' | 'intendedDate' | 'rescheduledCount'> & {
    intendedDate: Date;
    privacyPolicy: boolean;
    allowReschedule: boolean;
};

export type PriceRule = {
    id: string;
    pickup: string;
    destination: string;
    vehicleType: string;
    price: number;
    vehicleCount: number; // Number of vehicles for this route
}

export type Feedback = {
  id: string;
  name?: string;
  rating: number;
  message: string;
  createdAt: Date;
};
    