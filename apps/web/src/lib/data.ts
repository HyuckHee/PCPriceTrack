// Centralized data fetching layer.
// When NEXT_PUBLIC_API_URL is unset or points to localhost (e.g. Vercel demo),
// all functions return mock data immediately — no network requests are made.

import { api } from './api';
import {
  MOCK_CATEGORIES,
  MOCK_DEALS,
  MOCK_PRODUCT_DETAILS,
  getMockPriceHistory,
  getMockProductsResponse,
} from './mock-data';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
const IS_DEMO = !apiUrl || apiUrl.includes('localhost');

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface ProductListItem {
  id: string;
  groupId: string | null;
  name: string;
  brand: string;
  slug: string;
  imageUrl: string | null;
  /** 그룹이 있으면 그룹 정보 */
  group: { id: string; name: string; slug: string } | null;
  /** 그룹(또는 단독 제품) 내 최저가 */
  minPrice: string | null;
  /** 그룹(또는 단독 제품) 내 최고가 */
  maxPrice: string | null;
  currency: string | null;
  previousMinPrice: string | null;
  storeCount: number | null;
  storeNames: string | null;
  category: { id: string; name: string };
}

export interface ProductsResponse {
  data: ProductListItem[];
  meta: { total: number; page: number; totalPages: number };
}

export interface Deal {
  id: string;
  name: string;
  brand: string;
  slug: string;
  imageUrl?: string | null;
  categoryName: string;
  categorySlug?: string;
  currentPrice: string;
  previousPrice: string;
  originalPrice?: string | null;
  currency: string;
}

export interface Listing {
  listingId: string;
  url: string;
  latestPrice: string | null;
  latestCurrency: string | null;
  latestOriginalPrice: string | null;
  inStock: boolean | null;
  mallName?: string | null;
  store: { id: string; name: string; logoUrl: string | null };
}

export interface ProductVariant {
  id: string;
  name: string;
  brand: string;
  model: string;
  slug: string;
  imageUrl: string | null;
  specs: Record<string, unknown>;
  category: { name: string; slug: string };
  listings: Listing[];
}

/** 그룹 상세 (여러 variant를 묶음) */
export interface GroupDetail {
  type: 'group';
  group: { id: string; name: string; slug: string; imageUrl: string | null };
  variants: ProductVariant[];
}

/** 단독 제품 상세 */
export interface SingleProductDetail {
  type: 'product';
  id: string;
  name: string;
  brand: string;
  model: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  specs: Record<string, unknown>;
  category: { name: string; slug: string };
  listings: Listing[];
}

export type ProductDetail = GroupDetail | SingleProductDetail;

export interface PriceRecord {
  price: string;
  currency: string;
  recordedAt: string;
  store: { id: string; name: string };
}

// ── Data functions ─────────────────────────────────────────────────────────────

export async function fetchProducts(params: {
  search: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  page: string;
}): Promise<ProductsResponse> {
  if (IS_DEMO) {
    return getMockProductsResponse({ ...params, limit: 24 }) as unknown as ProductsResponse;
  }

  const query = new URLSearchParams({ page: params.page, limit: '24' });
  if (params.search) query.set('search', params.search);
  if (params.categoryId) query.set('categoryId', params.categoryId);
  if (params.minPrice) query.set('minPrice', params.minPrice);
  if (params.maxPrice) query.set('maxPrice', params.maxPrice);

  return api
    .get<ProductsResponse>(`/products?${query}`)
    .catch(() => getMockProductsResponse({ ...params, limit: 24 }) as unknown as ProductsResponse);
}

export async function fetchCategories(): Promise<Category[]> {
  if (IS_DEMO) return MOCK_CATEGORIES;
  return api.get<Category[]>('/categories').catch(() => MOCK_CATEGORIES);
}

export async function fetchDeals(limit: number, categoryId?: string): Promise<Deal[]> {
  if (IS_DEMO) {
    const filtered = categoryId
      ? MOCK_DEALS.filter((d) => d.categorySlug === categoryId)
      : MOCK_DEALS;
    return filtered.slice(0, limit) as Deal[];
  }
  const qs = `/products/deals?limit=${limit}${categoryId ? `&categoryId=${categoryId}` : ''}`;
  return api.get<Deal[]>(qs).catch(() => MOCK_DEALS.slice(0, limit) as Deal[]);
}

export async function fetchProduct(slug: string): Promise<ProductDetail | null> {
  if (IS_DEMO) {
    return (MOCK_PRODUCT_DETAILS[slug] as ProductDetail) ?? null;
  }
  try {
    return await api.get<ProductDetail>(`/products/${slug}`);
  } catch {
    return (MOCK_PRODUCT_DETAILS[slug] as ProductDetail) ?? null;
  }
}

export async function fetchPriceHistory(slug: string): Promise<PriceRecord[]> {
  if (IS_DEMO) return getMockPriceHistory(slug) as PriceRecord[];
  return api
    .get<PriceRecord[]>(`/products/${slug}/price-history?days=30`)
    .catch(() => getMockPriceHistory(slug) as PriceRecord[]);
}

// ── Build Estimator ────────────────────────────────────────────────────────────

export interface BuildComponent {
  category: string;
  categoryName: string;
  productId: string;
  productName: string;
  slug: string;
  brand: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  storeUrl: string | null;
  storeName: string | null;
  inStock: boolean;
  budgetAllocation?: number;
}

export interface BuildEstimate {
  budget: number;
  currency: string;
  totalPrice: number;
  components: (BuildComponent | null)[];
}

export interface SavedBuild {
  id: string;
  name: string;
  budget: string;
  currency: string;
  totalPrice: string | null;
  components: BuildComponent[];
  createdAt: string;
}

export async function fetchBuildEstimate(
  budget: number,
  currency: string,
): Promise<BuildEstimate | null> {
  try {
    return await api.post<BuildEstimate>('/builds/estimate', { budget, currency });
  } catch {
    return null;
  }
}

export async function saveBuild(
  name: string,
  budget: number,
  currency: string,
  totalPrice: number,
  components: BuildComponent[],
): Promise<SavedBuild | null> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? undefined : undefined;
  try {
    return await api.post<SavedBuild>('/builds', { name, budget, currency, totalPrice, components }, token);
  } catch {
    return null;
  }
}

export async function fetchSavedBuilds(limit = 20): Promise<SavedBuild[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? undefined : undefined;
  try {
    return await api.get<SavedBuild[]>(`/builds?limit=${limit}`, token);
  } catch {
    return [];
  }
}
