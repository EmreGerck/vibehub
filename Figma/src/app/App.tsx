import { RouterProvider } from 'react-router';
import { AppProvider } from './context/AppContext';
import { router } from './routes';
import { useEffect } from 'react';
import { projectId } from '/utils/supabase/info';

export default function App() {
  useEffect(() => {
    // Initialization is handled by the backend automatically.
  }, []);

  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}