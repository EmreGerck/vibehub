import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-8ae6f8e5`;

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  status?: string;
  createdAt?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: Array<{ productId: string; quantity: number; name: string; price: number }>;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    phone: string;
  };
  total: number;
  status: string;
  createdAt: string;
  estimatedDelivery: string;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  date: string;
  venue?: string;
  description: string;
}

export interface MerchGroup {
  id: string;
  name: string;
  description: string;
  image: string;
  banner: string;
}

export interface Admin {
  email: string;
  role: 'owner' | 'merch_admin';
  category?: string;
  name: string;
}

export interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  topProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  recentOrders: Order[];
}

export const api = {
  async signup(email: string, password: string, name: string) {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Signup failed');
    return data;
  },

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async getMe(token: string) {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Authentication failed');
    return data;
  },

  async getProducts(category?: string) {
    const url = category ? `${API_BASE}/products?category=${category}` : `${API_BASE}/products`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch products');
    return data.products as Product[];
  },

  async getProduct(id: string) {
    const response = await fetch(`${API_BASE}/products/${id}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch product');
    return data.product as Product;
  },

  async getCart(token: string) {
    const response = await fetch(`${API_BASE}/cart`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch cart');
    return data.cart as CartItem[];
  },

  async addToCart(token: string, productId: string, quantity: number = 1) {
    const response = await fetch(`${API_BASE}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ productId, quantity }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add to cart');
    return data.cart as CartItem[];
  },

  async updateCart(token: string, productId: string, quantity: number) {
    const response = await fetch(`${API_BASE}/cart/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ quantity }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update cart');
    return data.cart as CartItem[];
  },

  async removeFromCart(token: string, productId: string) {
    const response = await fetch(`${API_BASE}/cart/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to remove from cart');
    return data.cart as CartItem[];
  },

  async createOrder(token: string, items: any[], shippingAddress: any, total: number) {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ items, shippingAddress, total }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create order');
    return data.order as Order;
  },

  async getOrders(token: string) {
    const response = await fetch(`${API_BASE}/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch orders');
    return data.orders as Order[];
  },

  async getOrder(token: string, id: string) {
    const response = await fetch(`${API_BASE}/orders/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch order');
    return data.order as Order;
  },

  async getActivities(artist: string) {
    const response = await fetch(`${API_BASE}/activities/${artist}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch activities');
    return data.activities as Activity[];
  },

  async getMerchGroups() {
    const response = await fetch(`${API_BASE}/merch-groups`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch merch groups');
    return data.groups as MerchGroup[];
  },

  // Admin APIs
  async getAdminInfo(token: string) {
    const response = await fetch(`${API_BASE}/admin/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch admin info');
    return data.admin as Admin;
  },

  async addProduct(token: string, productData: { name: string; price: number; image: string; description: string }) {
    const response = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add product');
    return data.product as Product;
  },

  async getAdminProducts(token: string) {
    const response = await fetch(`${API_BASE}/admin/products`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch products');
    return data.products as Product[];
  },

  async updateProductStatus(token: string, productId: string, status: string) {
    const response = await fetch(`${API_BASE}/admin/products/${productId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update product status');
    return data.product as Product;
  },

  async deleteProduct(token: string, productId: string) {
    const response = await fetch(`${API_BASE}/admin/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete product');
    return data;
  },

  async getAnalytics(token: string) {
    const response = await fetch(`${API_BASE}/admin/analytics`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch analytics');
    return data as Analytics;
  },
};
