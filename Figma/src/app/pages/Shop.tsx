import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

export function Shop() {
  const { products, addToCart, user, refreshProducts } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    refreshProducts();
  }, []);

  const categories = ['all', 'Mode XL', 'KALT'];

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const handleAddToCart = async (productId: string, productName: string) => {
    if (!user) {
      toast.error('Please login to add items to cart');
      return;
    }

    setLoading(productId);
    try {
      await addToCart(productId);
      toast.success(`${productName} added to cart!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add to cart');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Shop Merchandise</h1>

        {/* Category Filter */}
        <div className="flex gap-4 mb-8 overflow-x-auto">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full whitespace-nowrap transition ${
                selectedCategory === category
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {category === 'all' ? 'All Products' : category}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className="bg-gray-800 rounded-lg overflow-hidden hover:scale-105 transition-transform"
            >
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-64 object-cover"
              />
              <div className="p-4">
                <div className="text-sm text-purple-400 mb-1">{product.category}</div>
                <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{product.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{product.price} ₺</span>
                  <button
                    onClick={() => handleAddToCart(product.id, product.name)}
                    disabled={loading === product.id}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-2 rounded transition"
                  >
                    <ShoppingCart size={18} />
                    {loading === product.id ? 'Adding...' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No products found in this category.
          </div>
        )}
      </div>
    </div>
  );
}
