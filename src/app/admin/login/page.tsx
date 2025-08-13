import { LoginForm } from "@/components/admin/login-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminLoginPage() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4">
      <Button asChild variant="ghost" className="absolute top-4 left-4 sm:top-8 sm:left-8">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </Button>
      <LoginForm />
    </div>
  );
}
