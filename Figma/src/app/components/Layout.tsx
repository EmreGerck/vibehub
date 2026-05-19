import { Outlet } from 'react-router';
import { Navbar } from './Navbar';
import { Toaster } from 'sonner';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <Outlet />
      <Toaster position="top-center" richColors />
    </div>
  );
}
