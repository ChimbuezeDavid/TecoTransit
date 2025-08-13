import BookingForm from '@/components/booking-form';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">
          RouteWise
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mt-2 max-w-2xl mx-auto">
          Your Journey, Simplified. Select your ride, set your dates, and get ready to travel with ease and comfort.
        </p>
      </div>
      <div className="max-w-3xl mx-auto">
        <BookingForm />
      </div>
    </div>
  );
}
