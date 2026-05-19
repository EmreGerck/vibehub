import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, Product, CartItem, Admin } from '../utils/api';

interface User {
  id: string;
  email: string;
  user_metadata: {
    name: string;
  };
}

interface AppContextType {
  user: User | null;
  token: string | null;
  cart: CartItem[];
  products: Product[];
  admin: Admin | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateCartItem: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  cartItemCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [admin, setAdmin] = useState<Admin | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }

    refreshProducts();
  }, []);

  useEffect(() => {
    if (token) {
      refreshCart();
      checkAdminStatus();
    }
  }, [token]);

  const checkAdminStatus = async () => {
    if (!token) return;
    try {
      const adminInfo = await api.getAdminInfo(token);
      setAdmin(adminInfo);
    } catch (error) {
      setAdmin(null);
    }
  };

  const refreshProducts = async () => {
    try {
      const allProducts = await api.getProducts();
      setProducts(allProducts);
    } catch (error) {
      console.error('Error refreshing products:', error);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('auth_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const signup = async (email: string, password: string, name: string) => {
    await api.signup(email, password, name);
    await login(email, password);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCart([]);
    setAdmin(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  };

  const refreshCart = async () => {
    if (!token) return;
    try {
      const cartData = await api.getCart(token);
      setCart(cartData);
    } catch (error) {
      console.error('Error refreshing cart:', error);
    }
  };

  const addToCart = async (productId: string, quantity: number = 1) => {
    if (!token) {
      throw new Error('Please login to add items to cart');
    }
    const cartData = await api.addToCart(token, productId, quantity);
    setCart(cartData);
  };

  const updateCartItem = async (productId: string, quantity: number) => {
    if (!token) return;
    const cartData = await api.updateCart(token, productId, quantity);
    setCart(cartData);
  };

  const removeFromCart = async (productId: string) => {
    if (!token) return;
    const cartData = await api.removeFromCart(token, productId);
    setCart(cartData);
  };

  const getProductById = (id: string) => {
    return products.find(p => p.id === id);
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        cart,
        products,
        admin,
        login,
        signup,
        logout,
        addToCart,
        updateCartItem,
        removeFromCart,
        refreshCart,
        refreshProducts,
        getProductById,
        cartItemCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
