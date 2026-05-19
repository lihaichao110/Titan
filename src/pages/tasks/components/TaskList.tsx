import { useNavigate } from "react-router-dom";
import { Play, Pencil, MoreHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Task, TaskStatus, TaskType } from "../types";
import { cn } from "@/lib/utils";

interface TaskListProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tasks: Task[];
}

const tabs = [
  { value: "all", label: "全部任务" },
  { value: "mine", label: "我的任务" },
  { value: "starred", label: "收藏任务" },
  { value: "scheduled", label: "定时任务" },
];

const typeStyles: Record<TaskType, { bg: string; text: string }> = {
  功能测试: { bg: "bg-[#F0F5FF]", text: "text-[#2563FF]" },
  接口测试: { bg: "bg-[#F0FDF4]", text: "text-[#16A34A]" },
  性能测试: { bg: "bg-[#FEF3C7]", text: "text-[#D97706]" },
};

const statusStyles: Record<
  TaskStatus,
  { bg: string; text: string; dot: string }
> = {
  running: { bg: "bg-[#F0FDF4]", text: "text-[#16A34A]", dot: "bg-[#16A34A]" },
  completed: {
    bg: "bg-[#EFF6FF]",
    text: "text-[#2563FF]",
    dot: "bg-[#2563FF]",
  },
  failed: { bg: "bg-[#FEF2F2]", text: "text-[#EF4444]", dot: "bg-[#EF4444]" },
  paused: { bg: "bg-[#FFF7ED]", text: "text-[#F97316]", dot: "bg-[#F97316]" },
};

const statusLabels: Record<TaskStatus, string> = {
  running: "运行中",
  completed: "已完成",
  failed: "失败",
  paused: "已暂停",
};

export function TaskList({ activeTab, onTabChange, tasks }: TaskListProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] overflow-hidden">
      {/* Tabs */}
      <div className="px-6 py-4 flex items-center gap-8 border-b border-[#E5E7EB]">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "text-sm font-medium pb-3 transition-colors border-b-2",
              activeTab === tab.value
                ? "text-[#2563FF] border-[#2563FF]"
                : "text-[#6B7280] border-transparent hover:text-[#374151]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="h-12 border-b border-[#E5E7EB] bg-[#FAFBFC]">
            <th className="w-12 px-4 text-left">
              <Checkbox />
            </th>
            <th className="px-4 text-left text-xs font-medium text-[#9CA3AF]">
              任务名称
            </th>
            <th className="w-24 px-4 text-left text-xs font-medium text-[#9CA3AF]">
              任务类型
            </th>
            <th className="w-24 px-4 text-left text-xs font-medium text-[#9CA3AF]">
              状态
            </th>
            <th className="w-24 px-4 text-left text-xs font-medium text-[#9CA3AF]">
              执行环境
            </th>
            <th className="w-24 px-4 text-left text-xs font-medium text-[#9CA3AF]">
              创建人
            </th>
            <th className="w-28 px-4 text-left text-xs font-medium text-[#9CA3AF]">
              更新时间
            </th>
            <th className="w-44 px-4 text-left text-xs font-medium text-[#9CA3AF]">
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const typeStyle = typeStyles[task.type];
            const statusStyle = statusStyles[task.status];
            return (
              <tr
                key={task.id}
                className="h-[72px] border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors"
              >
                <td className="px-4">
                  <Checkbox />
                </td>
                <td className="px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#1F2937]">
                      {task.name}
                    </span>
                    <button className="text-[#9CA3AF] hover:text-[#F59E0B]">
                      <Star className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-[#9CA3AF] mt-0.5">
                    {task.description}
                  </div>
                </td>
                <td className="px-4">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}
                  >
                    {task.type}
                  </span>
                </td>
                <td className="px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
                    />
                    {statusLabels[task.status]}
                  </span>
                </td>
                <td className="px-4 text-sm text-[#6B7280]">
                  {task.environment}
                </td>
                <td className="px-4 text-sm text-[#6B7280]">{task.creator}</td>
                <td className="px-4 text-sm text-[#6B7280]">
                  {task.updatedAt}
                </td>
                <td className="px-4">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-[#2563FF] hover:bg-[#1D4ED8] text-white h-7 px-3"
                      onClick={() => navigate(`/test-control?id=${task.id}`)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      执行
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 border-[#E5E7EB]"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      编辑
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-4 h-4 text-[#6B7280]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-36">
                        <DropdownMenuItem>复制任务</DropdownMenuItem>
                        <DropdownMenuItem>立即执行</DropdownMenuItem>
                        <DropdownMenuItem className="text-[#EF4444]">
                          删除任务
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
