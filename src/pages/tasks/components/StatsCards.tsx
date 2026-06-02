import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { StatsCardData, StatsCardsProps } from "@/types/tasks";

const colorStyles = {
  blue: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#2563FF]',
    icon: 'text-[#2563FF]',
  },
  green: {
    bg: 'bg-[#F0FDF4]',
    text: 'text-[#16A34A]',
    icon: 'text-[#16A34A]',
  },
  red: {
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#EF4444]',
    icon: 'text-[#EF4444]',
  },
  orange: {
    bg: 'bg-[#FFF7ED]',
    text: 'text-[#F97316]',
    icon: 'text-[#F97316]',
  },
  gray: {
    bg: 'bg-[#F3F4F6]',
    text: 'text-[#6B7280]',
    icon: 'text-[#6B7280]',
  },
};

function StatsCard({ item }: { item: StatsCardData }) {
  const colors = colorStyles[item.color];
  const TrendIcon = item.trend > 0 ? TrendingUp : item.trend < 0 ? TrendingDown : Minus;
  const trendColor = item.trend > 0 ? 'text-[#16A34A]' : item.trend < 0 ? 'text-[#EF4444]' : 'text-[#9CA3AF]';

  return (
    <div className="flex-1 h-[140px] bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] p-5 hover:shadow-md transition-shadow cursor-pointer">
      <div className={`text-xs font-medium ${colors.text}`}>{item.label}</div>
      <div className={`text-[36px] font-bold ${colors.text} leading-none mt-2`}>
        {item.value}
      </div>
      <div className={`flex items-center gap-1 mt-3 text-xs ${trendColor}`}>
        <TrendIcon className="w-3 h-3" />
        <span>
          {item.trend > 0 ? '+' : ''}
          {item.trend} {item.trendLabel}
        </span>
      </div>
    </div>
  );
}

export function StatsCards({ data }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-5 gap-5 mb-5">
      {data.map((item, index) => (
        <StatsCard key={index} item={item} />
      ))}
    </div>
  );
}
