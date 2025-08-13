import Link from "next/link";

export default function AdminFooter() {
    return (
        <footer className="bg-card shadow-sm">
            <div className="container mx-auto px-4 py-4">
                <div className="flex justify-center items-center">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} RouteWise Admin Panel
                    </p>
                </div>
            </div>
        </footer>
    );
}
