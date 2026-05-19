import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useApp } from '../context/AppContext';
import { api, Order } from '../utils/api';
import { Calendar, MapPin, Phone, Package, Truck, CheckCircle } from 'lucide-react';

export function OrderDetail() {
  const { orderId } = useParams();
  const { token, user } = useApp();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }

    if (!orderId) return;

    api.getOrder(token, orderId)
      .then(setOrder)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId, token, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto mb-4 text-gray-600" size={64} />
          <h2 className="text-2xl font-bold mb-2">Order not found</h2>
          <Link
            to="/account"
            className="inline-block bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg transition mt-4"
          >
            View All Orders
          </Link>
        </div>
      </div>
    );
  }

  const statusSteps = [
    { key: 'processing', label: 'Order Placed', icon: Package },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle },
  ];

  const currentStepIndex = statusSteps.findIndex(step => step.key === order.status);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link to="/account" className="text-purple-400 hover:text-purple-300 transition">
            ← Back to Orders
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">Order Details</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Order Status</h2>

              <div className="flex justify-between items-center mb-4">
                {statusSteps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <div key={step.key} className="flex-1">
                      <div className="flex items-center">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isActive ? 'bg-purple-600' : 'bg-gray-700'
                          } ${isCurrent ? 'ring-4 ring-purple-400/30' : ''}`}
                        >
                          <StepIcon size={24} />
                        </div>
                        {index < statusSteps.length - 1 && (
                          <div
                            className={`flex-1 h-1 mx-2 ${
                              isActive ? 'bg-purple-600' : 'bg-gray-700'
                            }`}
                          />
                        )}
                      </div>
                      <p className={`text-sm mt-2 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-purple-900/30 border border-purple-500/30 rounded">
                <p className="text-sm text-purple-200">
                  Estimated Delivery: {new Date(order.estimatedDelivery).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Order Items</h2>

              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-700 last:border-0">
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-gray-400">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{item.price * item.quantity} ₺</p>
                      <p className="text-sm text-gray-400">{item.price} ₺ each</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Shipping Address</h2>

              <div className="space-y-2 text-gray-300">
                <p className="font-semibold text-white">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.address}</p>
                <p className="flex items-center gap-2">
                  <MapPin size={16} />
                  {order.shippingAddress.city}, {order.shippingAddress.postalCode}
                </p>
                <p className="flex items-center gap-2">
                  <Phone size={16} />
                  {order.shippingAddress.phone}
                </p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 sticky top-20">
              <h2 className="text-2xl font-bold mb-4">Summary</h2>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar size={16} />
                  Order Date: {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                </div>
                <div className="text-sm text-gray-400">
                  Order ID: {order.id}
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>{order.total} ₺</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-700">
                  <span>Total</span>
                  <span>{order.total} ₺</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
