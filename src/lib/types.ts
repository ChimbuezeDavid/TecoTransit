export type Booking = {
  id: string;
  name: string;
  email: string;
  phone: string;
  pickup: string;
  destination: string;
  intendedDate: string;
  alternativeDate: string;
  vehicleType: '4-seater' | '5-seater' | '7-seater';
  luggageCount: number;
  totalFare: number;
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  createdAt: number;
  confirmedDate?: string;
};
