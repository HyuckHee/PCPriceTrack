import { notFound } from 'next/navigation';
import { fetchProduct, fetchPriceHistory, type GroupDetail, type SingleProductDetail, type Listing } from '@/lib/data';
import { ProductLowestPrice, ProductStoreList } from '@/components/ProductStorePrices';
import PriceHistoryChart from './PriceHistoryChart';

export const revalidate = 60;

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const product = await fetchProduct(slug);
  if (!product) notFound();

  const priceHistory = await fetchPriceHistory(slug);

  if (product.type === 'group') {
    return <GroupPage product={product} priceHistory={priceHistory} />;
  }
  return <SinglePage product={product} priceHistory={priceHistory} />;
}

// ── 그룹 페이지 ──────────────────────────────────────────────────────────────

function GroupPage({
  product,
  priceHistory,
}: {
  product: GroupDetail;
  priceHistory: { price: string; currency: string; recordedAt: string; store: { id: string; name: string } }[];
}) {
  const { group, variants } = product;

  // 모든 variant의 모든 listing 수집 → 최저가 listing 찾기
  const allListings: (Listing & { variantName: string })[] = variants.flatMap((v) =>
    v.listings.map((l) => ({ ...l, variantName: v.name })),
  );
  const lowestListing = [...allListings]
    .filter((l) => l.latestPrice)
    .sort((a, b) => parseFloat(a.latestPrice!) - parseFloat(b.latestPrice!))[0];

  const representativeImage = group.imageUrl ?? variants.find((v) => v.imageUrl)?.imageUrl;

  return (
    <div className="max-w-4xl">
      {/* 헤더 */}
      <div className="flex gap-6 mb-6">
        {representativeImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={representativeImage}
            alt={group.name}
            className="w-40 h-40 object-contain rounded-xl bg-gray-900 border border-gray-800 p-2 shrink-0"
          />
        )}
        <div>
          <div className="text-sm text-gray-400 mb-1">{variants[0]?.category.name}</div>
          <h1 className="text-2xl font-bold mb-1">{group.name}</h1>
          <div className="text-gray-400">{variants[0]?.brand}</div>
          <div className="text-xs text-blue-400 mt-1">{variants.length}개 변형 묶음</div>
        </div>
      </div>

      {lowestListing && <ProductLowestPrice listing={lowestListing} />}

      {/* 변형(variant)별 판매처 */}
      {variants.map((variant) => (
        <div key={variant.id} className="mb-6">
          <h2 className="font-semibold mb-2 text-sm text-gray-300">{variant.name}</h2>
          {variant.listings.length === 0 ? (
            <p className="text-gray-500 text-sm mb-2">등록된 판매처가 없습니다.</p>
          ) : (
            <ProductStoreList listings={variant.listings} />
          )}
        </div>
      ))}

      {/* 가격 히스토리 */}
      <h2 className="font-semibold mb-3">가격 히스토리 (30일)</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <PriceHistoryChart records={priceHistory} />
      </div>
    </div>
  );
}

// ── 단독 상품 페이지 ─────────────────────────────────────────────────────────

function SinglePage({
  product,
  priceHistory,
}: {
  product: SingleProductDetail;
  priceHistory: { price: string; currency: string; recordedAt: string; store: { id: string; name: string } }[];
}) {
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

      <h2 className="font-semibold mb-3">쇼핑몰별 가격</h2>
      {product.listings.length === 0 ? (
        <p className="text-gray-400 text-sm mb-6">등록된 판매처가 없습니다.</p>
      ) : (
        <ProductStoreList listings={product.listings} />
      )}

      <h2 className="font-semibold mb-3">가격 히스토리 (30일)</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <PriceHistoryChart records={priceHistory} />
      </div>
    </div>
  );
}
