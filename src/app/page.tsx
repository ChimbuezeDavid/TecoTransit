
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Car, CheckCircle, MapPin, Smile, Star, Ticket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import placeholderImages from '@/lib/placeholder-images.json';

const features = [
    {
        icon: <Star className="h-8 w-8 text-primary" />,
        title: "Comfort & Quality",
        description: "Travel in clean, comfortable, and well-maintained vehicles for a relaxing journey."
    },
    {
        icon: <Smile className="h-8 w-8 text-primary" />,
        title: "Reliable Service",
        description: "Count on us for punctual departures and arrivals, getting you to your destination on time."
    },
    {
        icon: <CheckCircle className="h-8 w-8 text-primary" />,
        title: "Easy Online Booking",
        description: "Secure your seat in just a few clicks with our simple and secure booking platform."
    }
];

const howItWorks = [
    {
        icon: <Ticket className="h-10 w-10 text-primary" />,
        title: "Book Your Seat",
        description: "Select your route, date, and vehicle, then fill in your details to reserve your spot."
    },
    {
        icon: <Car className="h-10 w-10 text-primary" />,
        title: "Get Confirmed",
        description: "Your trip is automatically confirmed once your vehicle is full. We handle all the logistics."
    },
    {
        icon: <MapPin className="h-10 w-10 text-primary" />,
        title: "Travel with Ease",
        description: "Arrive at the departure point on your travel date and enjoy a smooth ride to your destination."
    }
];

const destinations = [
  { name: "Abeokuta", image: placeholderImages.destinationAbeokuta },
  { name: "Ajah, Lagos", image: placeholderImages.destinationAjah },
  { name: "FESTAC, Lagos", image: placeholderImages.destinationFestac },
  { name: "Ibadan", image: placeholderImages.destinationIbadan },
  { name: "Iyana Paja, Lagos", image: placeholderImages.destinationIyanaPaja },
  { name: "Ojota, Lagos", image: placeholderImages.destinationOjota },
];

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px] sm:h-[70vh] flex items-center justify-center text-center text-white">
        <Image
          src={placeholderImages.hero.src}
          alt="A scenic road trip"
          fill
          priority
          className="object-cover"
          sizes="100vw"
          data-ai-hint={placeholderImages.hero['data-ai-hint']}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 p-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tight shadow-lg">
            Reliable Journeys, Seamlessly Booked
          </h1>
          <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto text-gray-200">
            Connecting ABUAD to your destination with comfort, safety, and punctuality. Your next trip starts here.
          </p>
          <Button asChild size="lg" className="mt-8 font-bold text-lg">
            <Link href="/book">
              Book Your Trip Now <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-headline">Why Travel With TecoTransit?</h2>
            <p className="mt-3 text-lg text-muted-foreground">
              We are committed to providing a superior travel experience from start to finish.
            </p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
                <CardHeader className="items-center">
                  {feature.icon}
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
       <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold font-headline">Your Journey in 3 Easy Steps</h2>
             <p className="mt-3 text-lg text-muted-foreground">
              We've simplified the travel process so you can focus on your trip.
            </p>
          </div>
          <div className="mt-16 max-w-5xl mx-auto">
             <div className="grid md:grid-cols-3 gap-8 text-center relative">
                {/* Dashed lines for larger screens */}
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-px -translate-y-12">
                   <svg width="100%" height="2">
                      <line x1="0" y1="1" x2="100%" y2="1" strokeWidth="2" strokeDasharray="8, 8" className="stroke-border" />
                   </svg>
                </div>
                 {howItWorks.map((step, index) => (
                  <div key={step.title} className="flex flex-col items-center relative bg-background px-4">
                      <div className="flex items-center justify-center h-24 w-24 rounded-full bg-primary/10 mb-6 border-2 border-primary">
                          {step.icon}
                      </div>
                      <h3 className="text-xl font-semibold">{step.title}</h3>
                      <p className="mt-2 text-muted-foreground">{step.description}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-headline">Ready for a Smooth Ride?</h2>
            <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
              Don't wait. Secure your seat today and experience travel the TecoTransit way.
            </p>
            <Button asChild size="lg" className="mt-8 font-bold text-lg">
              <Link href="/book">
                Book My Trip
              </Link>
            </Button>
        </div>
      </section>
    </div>
  );
}
