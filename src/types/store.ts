export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  costPrice?: number;
  stock: number;
  categoryId: string;
  imageURL?: string; // For backward compatibility
  imageURLs: string[];
  active: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  priceAtPurchase: number;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  items: OrderItem[];
  totalValue: number;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  createdAt: string; // ISO string or Firestore Timestamp
  paymentMethod: string;
}
