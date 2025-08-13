import BookingForm from '@/components/booking-form';
import CustomerPriceAlert from '@/components/customer-price-alert';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <CustomerPriceAlert />
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary tracking-tight">
          Book Your Trip with TecoTransit
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mt-2 max-w-2xl mx-auto">
          Fast, reliable, and comfortable rides to your destination.
        </p>
      </div>
      <div className="max-w-3xl mx-auto">
        <BookingForm />
      </div>
    </div>
  );
}
