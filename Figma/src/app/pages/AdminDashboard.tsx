import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { api, Product, Analytics } from '../utils/api';
import { toast } from 'sonner';
import { Package, TrendingUp, DollarSign, ShoppingBag, Check, X, Trash2, Plus } from 'lucide-react';

export function AdminDashboard() {
  const { admin, token } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    image: '',
    description: ''
  });

  useEffect(() => {
    if (!admin || !token) {
      navigate('/login');
      return;
    }

    loadData();
  }, [admin, token, navigate]);

  const loadData = async () => {
    if (!token) return;
    try {
      const [productsData, analyticsData] = await Promise.all([
        api.getAdminProducts(token),
        api.getAnalytics(token)
      ]);
      setProducts(productsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (productId: string) => {
    if (!token) return;
    try {
      await api.updateProductStatus(token, productId, 'approved');
      toast.success('Product approved');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve product');
    }
  };

  const handleReject = async (productId: string) => {
    if (!token) return;
    try {
      await api.updateProductStatus(token, productId, 'rejected');
      toast.success('Product rejected');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject product');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!token || !confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.deleteProduct(token, productId);
      toast.success('Product deleted');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete product');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      await api.addProduct(token, {
        name: newProduct.name,
        price: Number(newProduct.price),
        image: newProduct.image,
        description: newProduct.description
      });
      toast.success('Product added successfully');
      setShowAddProduct(false);
      setNewProduct({ name: '', price: '', image: '', description: '' });
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add product');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  const pendingProducts = products.filter(p => p.status === 'pending');
  const approvedProducts = products.filter(p => p.status === 'approved');

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">
              {admin.role === 'owner' ? 'Owner Dashboard' : `${admin.category} Admin`}
            </h1>
            <p className="text-gray-400 mt-2">{admin.name}</p>
          </div>
          <button
            onClick={() => setShowAddProduct(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg transition"
          >
            <Plus size={20} />
            Add Product
          </button>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="text-green-400" size={32} />
                <h3 className="text-lg font-semibold">Total Revenue</h3>
              </div>
              <p className="text-3xl font-bold">{analytics.totalRevenue} ₺</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <ShoppingBag className="text-blue-400" size={32} />
                <h3 className="text-lg font-semibold">Total Orders</h3>
              </div>
              <p className="text-3xl font-bold">{analytics.totalOrders}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Package className="text-purple-400" size={32} />
                <h3 className="text-lg font-semibold">Total Products</h3>
              </div>
              <p className="text-3xl font-bold">{approvedProducts.length}</p>
            </div>
          </div>
        )}

        {/* Top Products */}
        {analytics && analytics.topProducts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="text-purple-400" size={28} />
              Top Selling Products
            </h2>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left">Product</th>
                    <th className="px-6 py-3 text-left">Units Sold</th>
                    <th className="px-6 py-3 text-left">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topProducts.map(product => (
                    <tr key={product.id} className="border-t border-gray-700">
                      <td className="px-6 py-4">{product.name}</td>
                      <td className="px-6 py-4">{product.quantity}</td>
                      <td className="px-6 py-4">{product.revenue} ₺</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending Products (Owner Only) */}
        {admin.role === 'owner' && pendingProducts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Pending Approval</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingProducts.map(product => (
                <div key={product.id} className="bg-gray-800 rounded-lg overflow-hidden border-2 border-yellow-500">
                  <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <div className="text-sm text-yellow-400 mb-1">{product.category}</div>
                    <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                    <p className="text-gray-400 text-sm mb-3">{product.description}</p>
                    <p className="text-xl font-bold mb-4">{product.price} ₺</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(product.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition"
                      >
                        <Check size={18} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(product.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition"
                      >
                        <X size={18} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Products */}
        <div>
          <h2 className="text-2xl font-bold mb-4">
            {admin.role === 'owner' ? 'All Products' : 'My Products'}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {approvedProducts.map(product => (
              <div key={product.id} className="bg-gray-800 rounded-lg overflow-hidden">
                <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
                <div className="p-4">
                  <div className="text-sm text-purple-400 mb-1">{product.category}</div>
                  <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                  <p className="text-gray-400 text-sm mb-3">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <p className="text-xl font-bold">{product.price} ₺</p>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-400 hover:text-red-300 transition"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Product Modal */}
        {showAddProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Add New Product</h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Product Name</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Price (₺)</label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Image URL</label>
                  <input
                    type="url"
                    value={newProduct.image}
                    onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                    required
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    required
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded transition"
                  >
                    Add Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
