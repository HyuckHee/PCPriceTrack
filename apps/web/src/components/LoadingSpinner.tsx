import Image from 'next/image';

interface LoadingSpinnerProps {
  size?: number;
  text?: string;
}

export default function LoadingSpinner({ size = 80, text }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Image
        src="/loading.svg"
        alt="로딩 중"
        width={size}
        height={size}
        unoptimized
        priority
      />
      {text && <p className="text-sm text-gray-400">{text}</p>}
    </div>
  );
}
