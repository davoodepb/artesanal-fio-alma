export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  original_price: number | null;
  stock: number;
  category_id: string | null;
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string | null;
  user_name: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'mbway' | 'card' | 'transfer' | 'multibanco' | 'googlepay' | 'paypal';

export interface Order {
  id: string;
  user_id: string | null;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'canceled';
  total: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address_line1: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  customer_nif: string | null;
  shipping_address: string | null;
  notes: string | null;
  payment_method: PaymentMethod | null;
  invoice_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  nif: string | null;
  is_blocked: boolean;
  blocked_at: string | null;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string | null;
  is_published: boolean;
  created_at: string;
}

export type AppRole = 'admin' | 'customer';

export interface SeasonalTheme {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_auto_activate: boolean;
  image_url: string | null;
  primary_color: string | null;
  badge_label: string | null;
  banner_title: string | null;
  banner_subtitle: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}
