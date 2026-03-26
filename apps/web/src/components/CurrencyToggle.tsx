'use client';

import { useCurrency, type DisplayCurrency } from '@/context/CurrencyContext';

export function CurrencyToggle() {
  const { displayCurrency, usdToKrw, setDisplayCurrency } = useCurrency();

  return (
    <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-0.5 text-xs">
      <CurrencyOption
        value="KRW"
        label="₩ 원화"
        selected={displayCurrency === 'KRW'}
        onSelect={setDisplayCurrency}
      />
      <CurrencyOption
        value="USD"
        label="$ 달러"
        selected={displayCurrency === 'USD'}
        onSelect={setDisplayCurrency}
      />
      <span className="text-gray-600 text-[10px] px-1.5 hidden sm:inline">
        1$={Math.round(usdToKrw).toLocaleString('ko-KR')}원
      </span>
    </div>
  );
}

function CurrencyOption({
  value,
  label,
  selected,
  onSelect,
}: {
  value: DisplayCurrency;
  label: string;
  selected: boolean;
  onSelect: (c: DisplayCurrency) => void;
}) {
  return (
    <label className="flex items-center gap-1 cursor-pointer select-none">
      <input
        type="radio"
        name="displayCurrency"
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span
        className={`px-2.5 py-1 rounded-md transition-colors ${
          selected
            ? 'bg-blue-600 text-white font-medium'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        {label}
      </span>
    </label>
  );
}
