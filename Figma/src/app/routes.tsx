import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ModeXL } from './pages/ModeXL';
import { KALT } from './pages/KALT';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Account } from './pages/Account';
import { OrderDetail } from './pages/OrderDetail';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { AdminDashboard } from './pages/AdminDashboard';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: 'shop', Component: Shop },
      { path: 'modexl', Component: ModeXL },
      { path: 'kalt', Component: KALT },
      { path: 'cart', Component: Cart },
      { path: 'checkout', Component: Checkout },
      { path: 'account', Component: Account },
      { path: 'orders/:orderId', Component: OrderDetail },
      { path: 'login', Component: Login },
      { path: 'signup', Component: Signup },
      { path: 'admin', Component: AdminDashboard },
    ],
  },
]);
