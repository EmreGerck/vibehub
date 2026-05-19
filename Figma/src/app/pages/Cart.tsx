import { useApp } from '../context/AppContext';
import { Link, useNavigate } from 'react-router';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

export function Cart() {
  const { cart, getProductById, updateCartItem, removeFromCart, user } = useApp();
  const navigate = useNavigate();

  const cartItems = cart.map(item => ({
    ...item,
    product: getProductById(item.productId),
  })).filter(item => item.product);

  const total = cartItems.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  );

  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    try {
      if (newQuantity < 1) {
        await removeFromCart(productId);
        toast.success('Item removed from cart');
      } else {
        await updateCartItem(productId, newQuantity);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update cart');
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      await removeFromCart(productId);
      toast.success('Item removed from cart');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove item');
    }
  };

  const handleCheckout = () => {
    if (!user) {
      toast.error('Please login to proceed');
      navigate('/login');
      return;
    }
    navigate('/checkout');
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="mx-auto mb-4 text-gray-600" size={64} />
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-gray-400 mb-6">Add some merchandise to get started!</p>
          <Link
            to="/shop"
            className="inline-block bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg transition"
          >
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map(item => (
              <div
                key={item.productId}
                className="bg-gray-800 rounded-lg p-4 flex gap-4"
              >
                <img
                  src={item.product?.image}
                  alt={item.product?.name}
                  className="w-24 h-24 object-cover rounded"
                />

                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{item.product?.name}</h3>
                  <p className="text-purple-400 text-sm mb-2">{item.product?.category}</p>
                  <p className="text-xl font-bold">{item.product?.price} ₺</p>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => handleRemove(item.productId)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 size={20} />
                  </button>

                  <div className="flex items-center gap-2 bg-gray-700 rounded">
                    <button
                      onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                      className="p-2 hover:bg-gray-600 rounded transition"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                      className="p-2 hover:bg-gray-600 rounded transition"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 sticky top-20">
              <h2 className="text-2xl font-bold mb-4">Order Summary</h2>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>{total} ₺</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span>{total} ₺</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold transition"
              >
                Proceed to Checkout
              </button>

              <Link
                to="/shop"
                className="block text-center text-purple-400 hover:text-purple-300 mt-4 transition"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
