import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Booking } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getStatusVariant = (status: Booking['status']) => {
    switch (status) {
      case 'Confirmed': return 'default';
      case 'Cancelled': return 'destructive';
      case 'Paid': return 'secondary';
      case 'Pending': return 'outline';
      default: return 'outline';
    }
};
