export default function AdminFooter() {
    return (
        <footer className="bg-card shadow-sm">
            <div className="container mx-auto px-4 py-4">
                <div className="text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} RouteWise Admin Portal.
                </div>
            </div>
        </footer>
    );
}
