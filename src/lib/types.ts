
export type Booking = {
  id: string;
  name: string;
  email: string;
  phone: string;
  pickup: string;
  destination: string;
  intendedDate: string;
  alternativeDate: string;
  vehicleType: string;
  luggageCount: number;
  totalFare: number;
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  createdAt: number;
  confirmedDate?: string;
};

export type PriceRule = {
    id: string;
    pickup: string;
    destination: string;
    vehicleType: string;
    price: number;
}

export type PriceAlert = {
    content: string;
    updatedAt: number;
}
