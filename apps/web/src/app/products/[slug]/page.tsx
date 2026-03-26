import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductLowestPrice, ProductStoreList } from '@/components/ProductStorePrices';
import PriceHistoryChart from './PriceHistoryChart';

interface Listing {
  listingId: string;
  url: string;
  latestPrice: string | null;
  latestCurrency: string | null;
  latestOriginalPrice: string | null;
  inStock: boolean | null;
  store: { id: string; name: string; logoUrl: string | null };
}

interface PriceRecord {
  price: string;
  recordedAt: string;
  store: { id: string; name: string };
}

interface Product {
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

export const revalidate = 60;

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let product: Product;
  try {
    product = await api.get<Product>(`/products/${slug}`);
  } catch {
    notFound();
  }

  const priceHistory = await api
    .get<PriceRecord[]>(`/products/${slug}/price-history?days=30`)
    .catch(() => [] as PriceRecord[]);

  const lowestListing = [...product.listings]
    .filter((l) => l.latestPrice)
    .sort((a, b) => parseFloat(a.latestPrice!) - parseFloat(b.latestPrice!))[0];

  return (
    <div className="max-w-4xl">
      <div className="flex gap-6 mb-6">
        {product.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-40 h-40 object-contain rounded-xl bg-gray-900 border border-gray-800 p-2 shrink-0"
          />
        )}
        <div>
          <div className="text-sm text-gray-400 mb-1">{product.category.name}</div>
          <h1 className="text-2xl font-bold mb-1">{product.name}</h1>
          <div className="text-gray-400">
            {product.brand}
            {product.model ? ` · ${product.model}` : ''}
          </div>
        </div>
      </div>

      {lowestListing && <ProductLowestPrice listing={lowestListing} />}

      {product.description && (
        <p className="text-gray-400 text-sm mb-6">{product.description}</p>
      )}

      {Object.keys(product.specs).length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold mb-3">스펙</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
            {Object.entries(product.specs).map(([k, v]) => (
              <div key={k} className="flex px-4 py-2 text-sm">
                <span className="text-gray-400 w-40 capitalize">{k}</span>
                <span>{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 쇼핑몰별 가격 */}
      <h2 className="font-semibold mb-3">쇼핑몰별 가격</h2>
      {product.listings.length === 0 ? (
        <p className="text-gray-400 text-sm mb-6">등록된 판매처가 없습니다.</p>
      ) : (
        <ProductStoreList listings={product.listings} />
      )}

      {/* 가격 히스토리 차트 */}
      <h2 className="font-semibold mb-3">가격 히스토리 (30일)</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <PriceHistoryChart records={priceHistory} />
      </div>
    </div>
  );
}
