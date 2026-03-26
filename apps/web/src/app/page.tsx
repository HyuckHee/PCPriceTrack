import Link from 'next/link';

export default function Home() {
  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold mb-4">PC 부품 최저가 비교</h1>
      <p className="text-gray-400 text-lg mb-8">
        GPU, CPU, RAM, SSD 가격을 국내외 쇼핑몰에서 한눈에 비교하세요.
      </p>
      <Link
        href="/products"
        className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
      >
        상품 보기
      </Link>
    </div>
  );
}
