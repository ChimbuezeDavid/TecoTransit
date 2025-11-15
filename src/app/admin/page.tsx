import { redirect } from 'next/navigation';

// This page now simply redirects to the new dashboard page.
export default function AdminRootPage() {
  redirect('/admin/dashboard');
}
