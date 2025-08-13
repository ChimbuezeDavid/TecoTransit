import { Route } from "lucide-react";
import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-card shadow-sm">
            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
                        <Route className="h-6 w-6" />
                        <span className="font-headline">RouteWise</span>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} RouteWise. All rights reserved.
                    </p>
                    <nav className="flex items-center gap-4">
                        <Link href="/" className="text-sm text-muted-foreground hover:text-primary">Book a Trip</Link>
                        <Link href="/faqs" className="text-sm text-muted-foreground hover:text-primary">FAQs</Link>
                    </nav>
                </div>
            </div>
        </footer>
    );
}
