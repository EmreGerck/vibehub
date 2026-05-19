import { redirect } from 'next/navigation';

export default function VendorDashboardRoot() {
  redirect('/dashboard/vendor/overview');
}
