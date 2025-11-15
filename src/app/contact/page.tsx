import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { customerService } from "@/lib/constants";

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
            <h1 className="text-3xl font-bold font-headline text-primary">Help Center</h1>
            <p className="text-muted-foreground mt-1">Need assistance? Here's how you can reach us.</p>
        </div>
        
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Contact Customer Service</CardTitle>
                <CardDescription>For booking assistance, questions, or general inquiries, please get in touch with our team through any of the channels below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Get Immediate Help</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <Button asChild className="w-full" size="lg">
                            <Link href={`https://wa.me/${customerService.phone}`} target="_blank">
                                <MessageCircle className="mr-2 h-5 w-5" />
                                Chat on WhatsApp
                            </Link>
                        </Button>
                         <Button asChild className="w-full" size="lg" variant="outline">
                            <Link href={`tel:${customerService.phone}`} target="_blank">
                                <Phone className="mr-2 h-5 w-5" />
                                Call Us
                            </Link>
                        </Button>
                    </div>
                </div>

                 <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-lg">Send Us an Email</h3>
                     <p className="text-sm text-muted-foreground">For less urgent matters or detailed inquiries, you can send us an email. We typically respond within 24 hours.</p>
                     <Button asChild key="email" className="w-full sm:w-auto" size="lg" variant="outline">
                        <Link href={`mailto:${customerService.email}`} target="_blank">
                            <Mail className="mr-2 h-5 w-5" />
                            {customerService.email}
                        </Link>
                    </Button>
                </div>
                
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
