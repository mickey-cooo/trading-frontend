// Mirrors the backend DTOs. Every amount and price is a decimal string.
export type MarketStatus = "ACTIVE" | "PENDING" | "SUSPENDED" | "DELETED";
export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";
export type OrderStatus = "OPEN" | "FILLED" | "CANCELLED";
export type CandleInterval = "1m" | "5m" | "1h";
export type LedgerType = "FUNDING" | "RESERVE" | "RELEASE" | "TRADE";

export interface Market {
  pair: string;
  base: string;
  quote: string;
  status: MarketStatus;
  quantityIncrement: string;
  priceIncrement: string;
}

export interface MarketHours {
  isOpen: boolean;
  open: string; // daily window in UTC, "HH:mm"
  close: string;
  nextChange: string | null; // ISO time the market next opens or closes; null when open all day
}

export interface Candle {
  time: number; // slot start, unix seconds
  open: string;
  high: string;
  low: string;
  close: string;
}

export interface Quote {
  pair: string;
  price: string;
  version: number;
  timestamp: string;
}

export interface SubmitOrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  limitPrice?: string;
}

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  limitPrice: string | null;
  status: OrderStatus;
  createdAt: string;
}

export interface Trade {
  orderId: string;
  price: string;
  quantity: string;
  quoteVersion: number;
  timestamp: string;
}

export interface Balance {
  asset: string;
  available: string;
  reserved: string;
}

export interface PortfolioAsset extends Balance {
  valueUsdt: string | null;
}

export interface Portfolio {
  quoteTime: string | null;
  assets: PortfolioAsset[];
}

export interface LedgerEntry {
  asset: string;
  bucket: "AVAILABLE" | "RESERVED";
  amount: string;
  type: LedgerType;
  reference: string;
  timestamp: string;
}

export interface Page<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type Role = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "PENDING" | "SUSPENDED" | "DELETED";

export interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  status: UserStatus;
  role: Role | null;
  userType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProfileInput {
  firstName: string;
  lastName: string;
}
