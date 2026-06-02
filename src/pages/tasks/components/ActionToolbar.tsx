import { Search, Filter, Plus, Upload, ChevronDown } from 'lucide-react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu';

export function ActionToolbar() {
  return (
    <div className="h-[72px] px-6 flex items-center justify-between bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] mb-5">
      <div className="flex items-center gap-3">
        <Button className="bg-[#2563FF] hover:bg-[#1D4ED8] text-white">
          <Plus className="w-4 h-4 mr-1" />
          新建任务
        </Button>
        <Button variant="outline" className="border-[#E5E7EB] text-[#374151]">
          <Upload className="w-4 h-4 mr-1" />
          导入任务
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-[#E5E7EB] text-[#374151]">
              批量操作
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem>批量删除</DropdownMenuItem>
            <DropdownMenuItem>批量执行</DropdownMenuItem>
            <DropdownMenuItem>批量暂停</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <Input
            placeholder="搜索任务名称"
            className="w-64 pl-9 h-9 bg-[#F9FAFB] border-[#E5E7EB] text-sm"
          />
        </div>
        <Select value="all">
          <SelectTrigger className="h-9 bg-[#F9FAFB] border-[#E5E7EB] text-sm">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="running">运行中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
            <SelectItem value="paused">已暂停</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="h-9 border-[#E5E7EB]">
          <Filter className="w-4 h-4 mr-1" />
          筛选
        </Button>
      </div>
    </div>
  );
}