import { Link, useNavigate } from 'react-router';
import { ShoppingCart, User, LogOut, Menu, X, ChevronDown, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useState, useEffect } from 'react';
import { api, MerchGroup } from '../utils/api';

export function Navbar() {
  const { user, logout, cartItemCount, admin } = useApp();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [merchDropdownOpen, setMerchDropdownOpen] = useState(false);
  const [merchGroups, setMerchGroups] = useState<MerchGroup[]>([]);

  useEffect(() => {
    api.getMerchGroups().then(setMerchGroups).catch(console.error);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-black text-white sticky top-0 z-50 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            VibeHub
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/shop" className="hover:text-purple-400 transition">Shop</Link>

            {/* Merch Groups Dropdown */}
            <div className="relative">
              <button
                onClick={() => setMerchDropdownOpen(!merchDropdownOpen)}
                onBlur={() => setTimeout(() => setMerchDropdownOpen(false), 200)}
                className="flex items-center gap-1 hover:text-purple-400 transition"
              >
                Artists <ChevronDown size={16} />
              </button>
              {merchDropdownOpen && (
                <div className="absolute top-full mt-2 bg-gray-800 rounded-lg shadow-lg min-w-[200px] py-2 border border-gray-700 z-50">
                  {merchGroups.map(group => (
                    <Link
                      key={group.id}
                      to={`/${group.id}`}
                      className="block px-4 py-2 hover:bg-gray-700 transition"
                      onClick={() => setMerchDropdownOpen(false)}
                    >
                      {group.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link to="/cart" className="relative hover:text-purple-400 transition">
              <ShoppingCart size={24} />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-4">
                {admin && (
                  <Link to="/admin" className="flex items-center gap-1 hover:text-purple-400 transition">
                    <Shield size={20} />
                    <span>Admin</span>
                  </Link>
                )}
                <Link to="/account" className="hover:text-purple-400 transition flex items-center gap-2">
                  <User size={20} />
                  <span>{user.user_metadata.name}</span>
                </Link>
                <button onClick={handleLogout} className="hover:text-purple-400 transition">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition">
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 flex flex-col gap-4 border-t border-gray-800">
            <Link to="/shop" onClick={() => setMobileMenuOpen(false)} className="hover:text-purple-400 transition">
              Shop
            </Link>
            <div className="text-sm text-gray-400 font-semibold">Artists</div>
            {merchGroups.map(group => (
              <Link
                key={group.id}
                to={`/${group.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-purple-400 transition pl-4"
              >
                {group.name}
              </Link>
            ))}
            <Link to="/cart" onClick={() => setMobileMenuOpen(false)} className="hover:text-purple-400 transition flex items-center gap-2">
              <ShoppingCart size={20} />
              Cart {cartItemCount > 0 && `(${cartItemCount})`}
            </Link>
            {user ? (
              <>
                {admin && (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="hover:text-purple-400 transition flex items-center gap-2">
                    <Shield size={20} />
                    Admin Panel
                  </Link>
                )}
                <Link to="/account" onClick={() => setMobileMenuOpen(false)} className="hover:text-purple-400 transition">
                  My Account
                </Link>
                <button onClick={handleLogout} className="text-left hover:text-purple-400 transition">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="hover:text-purple-400 transition">
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
