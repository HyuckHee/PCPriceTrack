import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  buildUrl: (page: string) => string;
}

/**
 * 페이지네이션 컴포넌트.
 * 형식: ← 1 ... 4 5 [6] 7 8 ... 20 →
 * 윈도우: 현재 페이지 ± 2
 */
export function Pagination({ currentPage, totalPages, buildUrl }: PaginationProps) {
  if (totalPages <= 1) return null;

  // 보여줄 페이지 번호 목록 계산 (ellipsis는 null로 표현)
  const pages = getPageNumbers(currentPage, totalPages);

  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  const btnBase = 'flex items-center justify-center min-w-[2rem] h-8 px-2 rounded text-sm transition-colors';
  const btnActive = 'bg-blue-600 text-white font-semibold cursor-default';
  const btnDefault = 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700';
  const btnDisabled = 'text-gray-600 cursor-not-allowed';

  return (
    <nav className="flex items-center gap-1 mt-8 justify-center flex-wrap" aria-label="페이지네이션">
      {/* 이전 버튼 */}
      {prevPage ? (
        <Link href={buildUrl(String(prevPage))} className={`${btnBase} ${btnDefault}`} aria-label="이전 페이지">
          ←
        </Link>
      ) : (
        <span className={`${btnBase} ${btnDisabled}`} aria-disabled>←</span>
      )}

      {/* 페이지 번호 */}
      {pages.map((p, i) =>
        p === null ? (
          <span key={`ellipsis-${i}`} className={`${btnBase} ${btnDisabled}`}>
            …
          </span>
        ) : p === currentPage ? (
          <span key={p} className={`${btnBase} ${btnActive}`} aria-current="page">
            {p}
          </span>
        ) : (
          <Link key={p} href={buildUrl(String(p))} className={`${btnBase} ${btnDefault}`}>
            {p}
          </Link>
        ),
      )}

      {/* 다음 버튼 */}
      {nextPage ? (
        <Link href={buildUrl(String(nextPage))} className={`${btnBase} ${btnDefault}`} aria-label="다음 페이지">
          →
        </Link>
      ) : (
        <span className={`${btnBase} ${btnDisabled}`} aria-disabled>→</span>
      )}
    </nav>
  );
}

/** 현재 페이지 ± 2 윈도우 + 첫/마지막 페이지 + ellipsis 계산 */
function getPageNumbers(current: number, total: number): (number | null)[] {
  const WINDOW = 2; // 현재 페이지 기준 좌우 표시 개수
  const result: (number | null)[] = [];

  const start = Math.max(2, current - WINDOW);
  const end = Math.min(total - 1, current + WINDOW);

  // 첫 페이지는 항상 표시
  result.push(1);

  // 첫 페이지와 윈도우 사이 gap
  if (start > 2) result.push(null); // ellipsis

  // 윈도우 범위
  for (let i = start; i <= end; i++) result.push(i);

  // 윈도우와 마지막 페이지 사이 gap
  if (end < total - 1) result.push(null); // ellipsis

  // 마지막 페이지는 항상 표시 (total > 1 이므로 항상 추가)
  if (total > 1) result.push(total);

  return result;
}
