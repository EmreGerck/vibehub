import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Calendar, MapPin, Music, ShoppingBag } from 'lucide-react';
import { api, Activity } from '../utils/api';
import { useApp } from '../context/AppContext';

export function ModeXL() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { products } = useApp();

  useEffect(() => {
    api.getActivities('modexl')
      .then(setActivities)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const modeXLProducts = products.filter(p => p.category === 'Mode XL');

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-gray-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Mode XL
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            Turkish Rap Group - Street Sounds & Urban Vibes
          </p>
          <div className="flex justify-center gap-4">
            <Music className="text-purple-400" size={24} />
            <span className="text-gray-400">Turkish Rap & Hip-Hop</span>
          </div>
        </div>

        {/* Activities Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="text-purple-400" size={32} />
            Upcoming Events & Releases
          </h2>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading activities...</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map(activity => (
                <div
                  key={activity.id}
                  className="bg-gray-800 rounded-lg p-6 border border-purple-500/30 hover:border-purple-500 transition"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {activity.type === 'concert' ? (
                      <Music className="text-purple-400 flex-shrink-0" size={24} />
                    ) : (
                      <ShoppingBag className="text-purple-400 flex-shrink-0" size={24} />
                    )}
                    <div>
                      <div className="text-sm text-purple-400 uppercase mb-1">{activity.type}</div>
                      <h3 className="text-xl font-semibold mb-2">{activity.title}</h3>
                    </div>
                  </div>

                  <div className="space-y-2 text-gray-300">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={16} />
                      {new Date(activity.date).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    {activity.venue && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin size={16} />
                        {activity.venue}
                      </div>
                    )}
                    <p className="text-sm text-gray-400 mt-3">{activity.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Merchandise Section */}
        <div>
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <ShoppingBag className="text-purple-400" size={32} />
            Official Merchandise
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modeXLProducts.map(product => (
              <Link
                key={product.id}
                to="/shop"
                className="bg-gray-800 rounded-lg overflow-hidden hover:scale-105 transition-transform"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-64 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                  <p className="text-gray-400 text-sm mb-3">{product.description}</p>
                  <div className="text-2xl font-bold text-purple-400">{product.price} ₺</div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              to="/shop"
              className="inline-block bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg font-semibold transition"
            >
              View All Mode XL Products
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
