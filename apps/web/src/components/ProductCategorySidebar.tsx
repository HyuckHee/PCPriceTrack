'use client';

import { useQueryStates, parseAsString } from 'nuqs';
import { useTransition } from 'react';
import { CATEGORY_ICONS, CATEGORY_NAME_TO_SLUG, CATEGORY_ORDER } from '@/lib/drag-utils';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  categories: Category[];
}

export function ProductCategorySidebar({ categories }: Props) {
  const [isPending, startTransition] = useTransition();

  const [params, setParams] = useQueryStates(
    {
      categoryId: parseAsString.withDefault(''),
      page: parseAsString.withDefault('1'),
    },
    { shallow: false },
  );

  const select = (id: string) =>
    startTransition(() => { void setParams({ categoryId: id, page: '1' }); });

  return (
    <aside className="w-[220px] shrink-0">
      <div className="sticky top-4 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-gray-200">카테고리</span>
        </div>
        <ul className="py-2">
          {/* 전체 */}
          <li>
            <button
              onClick={() => select('')}
              disabled={isPending}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                params.categoryId === ''
                  ? 'bg-indigo-600/30 text-indigo-300 font-medium'
                  : 'text-gray-300 hover:bg-gray-700/60 hover:text-white'
              }`}
            >
              <span className="text-base">🖥️</span>
              전체
            </button>
          </li>
          {[...categories].sort((a, b) => {
            const slugA = a.slug ?? CATEGORY_NAME_TO_SLUG[a.name];
            const slugB = b.slug ?? CATEGORY_NAME_TO_SLUG[b.name];
            const iA = CATEGORY_ORDER.indexOf(slugA as typeof CATEGORY_ORDER[number]);
            const iB = CATEGORY_ORDER.indexOf(slugB as typeof CATEGORY_ORDER[number]);
            return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB);
          }).map((cat) => {
            const slug = cat.slug ?? CATEGORY_NAME_TO_SLUG[cat.name];
            const icon = slug ? (CATEGORY_ICONS[slug] ?? '📦') : '📦';
            const isActive = params.categoryId === cat.id;
            return (
              <li key={cat.id}>
                <button
                  onClick={() => select(cat.id)}
                  disabled={isPending}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                    isActive
                      ? 'bg-indigo-600/30 text-indigo-300 font-medium'
                      : 'text-gray-300 hover:bg-gray-700/60 hover:text-white'
                  }`}
                >
                  <span className="text-base">{icon}</span>
                  {cat.name}
                </button>
              </li>
            );
          })}
        </ul>
        {isPending && (
          <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-400">
            불러오는 중...
          </div>
        )}
      </div>
    </aside>
  );
}
