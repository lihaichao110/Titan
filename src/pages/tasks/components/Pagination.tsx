import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = generatePages(currentPage, totalPages);

  return (
    <div className="flex items-center justify-end gap-2 py-4">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 border-[#E5E7EB]"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {pages.map((page, index) => (
        <span key={index}>
          {page === '...' ? (
            <span className="px-2 text-[#9CA3AF]">...</span>
          ) : (
            <Button
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              className={`h-8 w-8 ${
                currentPage === page
                  ? 'bg-[#2563FF] text-white hover:bg-[#1D4ED8]'
                  : 'border-[#E5E7EB] text-[#374151]'
              }`}
              onClick={() => onPageChange(Number(page))}
            >
              {page}
            </Button>
          )}
        </span>
      ))}

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 border-[#E5E7EB]"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      <span className="ml-2 text-sm text-[#6B7280]">
        共 {totalPages} 页
      </span>
    </div>
  );
}

function generatePages(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, 4, 5, '...', total];
  }

  if (current >= total - 2) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, '...', current - 1, current, current + 1, '...', total];
}