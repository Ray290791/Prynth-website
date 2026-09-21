import type { CartItem } from "./cart-store";

export type Address = {
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
};

export type Order = {
  id: string;
  createdAt: string;
  address: Address;
  shippingMethod: "standard" | "express";
  paymentMethod: "upi" | "card" | "cod";
  paymentMeta: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  extra: number;
  total: number;
  notes?: string;
};
