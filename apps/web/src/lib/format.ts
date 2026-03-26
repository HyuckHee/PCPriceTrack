/** 통화 변환 (USD↔KRW) */
export function convertPrice(
  price: number,
  fromCurrency: string,
  toCurrency: string,
  usdToKrw: number,
): number {
  if (fromCurrency === toCurrency) return price;
  if (fromCurrency === 'USD' && toCurrency === 'KRW') return price * usdToKrw;
  if (fromCurrency === 'KRW' && toCurrency === 'USD') return price / usdToKrw;
  return price;
}

export function formatPrice(price: number, currency: string): string {
  if (currency === 'KRW') {
    return `₩${Math.round(price).toLocaleString('ko-KR')}`;
  }
  return `$${price.toFixed(2)}`;
}

/** 카드 등 간략 표시용: KRW → 약 32만원, USD → $154.99 */
export function formatPriceShort(price: number, currency: string): string {
  if (currency === 'KRW') {
    const man = Math.floor(price / 10000);
    return `약 ${man}만원`;
  }
  return `$${price.toFixed(2)}`;
}

/**
 * 상품명에서 카테고리별 핵심 스펙 뱃지를 추출합니다.
 * 예) "CORSAIR Vengeance LPX DDR4 32GB 3200MHz" → ['32GB', 'DDR4', '3200MHz']
 */
export function extractSpecBadges(name: string, categoryName: string): string[] {
  const badges: string[] = [];
  const cat = categoryName.toLowerCase();

  // 용량 (RAM/SSD/GPU 공통)
  const capacityMatch = name.match(/\b(\d+\s*TB|\d+\s*GB|\d+\s*MB)\b/i);
  if (capacityMatch) badges.push(capacityMatch[1].replace(/\s+/, '').toUpperCase());

  if (cat.includes('ram') || cat.includes('memory') || cat.includes('메모리')) {
    // 메모리 타입
    const typeMatch = name.match(/\b(DDR5X?|DDR4X?|DDR3L?|LPDDR[45]X?)\b/i);
    if (typeMatch) badges.push(typeMatch[1].toUpperCase());
    // 속도
    const speedMatch = name.match(/\b(\d{3,5}\s*MHz)\b/i);
    if (speedMatch) badges.push(speedMatch[1].replace(/\s+/, ''));
    // 채널 구성
    const kitMatch = name.match(/\((\d+x\d+GB|\d+×\d+GB)\)/i);
    if (kitMatch) badges.push(kitMatch[1].replace('×', 'x'));

  } else if (cat.includes('gpu') || cat.includes('graphics') || cat.includes('그래픽')) {
    // GPU 메모리 타입
    const vramType = name.match(/\b(GDDR6X?|GDDR5X?|GDDR[34]|HBM[2e]?)\b/i);
    if (vramType) badges.push(vramType[1].toUpperCase());
    // 인터페이스
    const pcieMatch = name.match(/\b(PCIe\s*[0-9.]+x?\d*|PCI\s*Express\s*[0-9.]+)\b/i);
    if (pcieMatch) badges.push(pcieMatch[1].replace(/\s+/g, ' ').trim());

  } else if (cat.includes('cpu') || cat.includes('processor') || cat.includes('프로세서')) {
    // 코어 수
    const coreMatch = name.match(/\b(\d+[\s-]?Core|\d+[\s-]?코어)\b/i);
    if (coreMatch) badges.push(coreMatch[1].replace(/\s+|-/g, '-'));
    // 소켓
    const socketMatch = name.match(/\b(AM[345]\+?|LGA\s*\d{3,4}|FM[12]\+?)\b/i);
    if (socketMatch) badges.push(socketMatch[1].replace(/\s+/, ''));
    // 베이스 클럭
    const ghzMatch = name.match(/\b(\d+\.\d+\s*GHz)\b/i);
    if (ghzMatch) badges.push(ghzMatch[1].replace(/\s+/, ''));

  } else if (cat.includes('ssd') || cat.includes('storage') || cat.includes('저장')) {
    // 인터페이스
    const ifaceMatch = name.match(/\b(NVMe|PCIe\s*[0-9.]+|SATA\s*[36]?Gb?s?|M\.2)\b/i);
    if (ifaceMatch) badges.push(ifaceMatch[1].replace(/\s+/g, ''));
    // 폼팩터
    const formMatch = name.match(/\b(M\.2|2\.5"|2280|2242)\b/i);
    if (formMatch && !badges.includes(formMatch[1])) badges.push(formMatch[1]);
    // 읽기 속도
    const speedMatch = name.match(/(\d{3,5}\s*MB\/s)/i);
    if (speedMatch) badges.push(speedMatch[1].replace(/\s+/, ''));
  }

  // 중복 제거 후 최대 3개
  return [...new Set(badges)].slice(0, 3);
}
