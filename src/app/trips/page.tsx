import BookingHistory from '@/components/booking-history';

export default function TripsPage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline text-primary">My Trips</h1>
        <p className="text-muted-foreground mt-1">View the status of your past and current booking requests.</p>
      </div>
      <BookingHistory />
    </div>
  );
}
