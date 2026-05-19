import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useApp } from '../context/AppContext';
import { api, Order } from '../utils/api';
import { User, Package, LogOut, Calendar, MapPin } from 'lucide-react';

export function Account() {
  const { user, logout, token } = useApp();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }

    api.getOrders(token)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, token, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="font-semibold">{user.user_metadata.name}</h2>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 text-red-400 hover:text-red-300 transition"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <h1 className="text-4xl font-bold mb-8">My Orders</h1>

            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-12 text-center">
                <Package className="mx-auto mb-4 text-gray-600" size={64} />
                <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
                <p className="text-gray-400 mb-6">Start shopping to see your orders here!</p>
                <Link
                  to="/shop"
                  className="inline-block bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg transition"
                >
                  Shop Now
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="block bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Order #{order.id}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar size={16} />
                            {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={16} />
                            {order.shippingAddress.city}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold">{order.total} ₺</div>
                        <div className={`text-sm px-3 py-1 rounded-full mt-2 ${
                          order.status === 'delivered'
                            ? 'bg-green-900 text-green-300'
                            : 'bg-purple-900 text-purple-300'
                        }`}>
                          {order.status}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                      <p className="text-sm text-gray-400 mb-2">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <span key={idx} className="text-sm bg-gray-700 px-3 py-1 rounded">
                            {item.name} × {item.quantity}
                          </span>
                        ))}
                        {order.items.length > 3 && (
                          <span className="text-sm bg-gray-700 px-3 py-1 rounded">
                            +{order.items.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
