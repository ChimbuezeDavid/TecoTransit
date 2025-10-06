
import BookingForm from '@/components/booking-form';
import CustomerPriceAlert from '@/components/customer-price-alert';
import GroupBookingForm from '@/components/group-booking-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary tracking-tight">
          Book Your Trip with TecoTransit
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mt-2 max-w-2xl mx-auto">
          Fast, reliable, and comfortable rides to your destination.
        </p>
      </div>
      <div className="max-w-3xl mx-auto">
        <CustomerPriceAlert />
        <Tabs defaultValue="individual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="individual">Individual Booking</TabsTrigger>
            <TabsTrigger value="group">Group Booking</TabsTrigger>
          </TabsList>
          <TabsContent value="individual">
            <BookingForm />
          </TabsContent>
          <TabsContent value="group">
            <GroupBookingForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
