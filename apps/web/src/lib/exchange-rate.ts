/** 실시간 USD → KRW 환율 조회 (1시간 캐시, 실패 시 기본값 1380) */
export async function getUsdToKrw(): Promise<number> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return 1380;
    const data = (await res.json()) as { rates?: { KRW?: number } };
    return data.rates?.KRW ?? 1380;
  } catch {
    return 1380;
  }
}
