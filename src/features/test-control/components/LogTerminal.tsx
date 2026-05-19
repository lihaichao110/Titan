import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { useExecutionStore } from "../store/executionStore";
import type { LogLevel } from "../types";

const levelColors: Record<LogLevel, string> = {
  INFO: "bg-blue-100 text-[#2563FF]",
  SUCCESS: "bg-green-100 text-[#16A34A]",
  ERROR: "bg-red-100 text-[#EF4444]",
};

export function LogTerminal({ height = "h-[640px]" }: { height?: string }) {
  const {
    context,
    logFilter,
    autoScroll,
    setLogFilter,
    setAutoScroll,
    clearLogs,
  } = useExecutionStore();
  const { logs } = context;
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs =
    logFilter === "ALL" ? logs : logs.filter((l) => l.level === logFilter);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  return (
    <div 
      className={`${height} flex flex-col bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] overflow-hidden`}
      >
      {/* Header toolbar */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-[#E5E7EB]">
        <h3 className="text-sm font-medium text-[#1F2937]">实时日志</h3>

        <div className="flex items-center gap-3">
          <Select
            value={logFilter}
            onValueChange={(v) => setLogFilter(v as LogLevel | "ALL")}
          >
            <SelectTrigger className="w-24 h-8 text-xs bg-[#F9FAFB]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部</SelectItem>
              <SelectItem value="INFO">INFO</SelectItem>
              <SelectItem value="SUCCESS">SUCCESS</SelectItem>
              <SelectItem value="ERROR">ERROR</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-[#E5E7EB] text-[#6B7280]"
            onClick={clearLogs}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            清空
          </Button>
        </div>
      </div>

      {/* Log entries - smaller font, tighter spacing */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="font-mono text-xs p-4 space-y-2">
          {filteredLogs.map((log, index) => (
            <div key={index} className="flex items-start gap-3">
              <span className="text-[#9CA3AF] w-16 flex-shrink-0">
                {log.time}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${levelColors[log.level]}`}
              >
                {log.level}
              </span>
              <span className="text-[#374151] break-all">{log.msg}</span>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Bottom: auto-scroll toggle */}
      <div className="h-12 px-5 flex items-center border-t border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="flex items-center gap-2">
          <Switch
            id="auto-scroll"
            checked={autoScroll}
            onCheckedChange={setAutoScroll}
          />
          <Label htmlFor="auto-scroll" className="text-xs text-[#6B7280]">
            自动滚动
          </Label>
        </div>
      </div>
    </div>
  );
}
