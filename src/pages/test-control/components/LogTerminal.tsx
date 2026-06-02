import { useLayoutEffect, useRef } from "react";
import { Button } from "@/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { Switch } from "@/components/switch";
import { ScrollArea } from "@/components/scroll-area";
import { Label } from "@/components/label";
import { Trash2 } from "lucide-react";
import { useExecutionStore } from "@/store/test-control";
import type { LogLevel } from "../../../types";

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
  const bottomRef = useRef<HTMLDivElement>(null);

  const filteredLogs =
    logFilter === "ALL" ? logs : logs.filter((l) => l.level === logFilter);

  useLayoutEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ block: "end" });
    }
  }, [autoScroll, logFilter, filteredLogs.length]);

  return (
    <div
      className={`${height} min-w-0 flex flex-col bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] overflow-hidden`}
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
      <ScrollArea className="flex-1 min-w-0">
        <div className="min-w-0 font-mono text-xs p-4 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="min-h-[140px] flex items-center justify-center px-4 text-center font-sans">
              <span className="text-sm text-[#9CA3AF]">
                点击执行后显示实时日志
              </span>
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={index} className="flex min-w-0 items-start gap-3">
                <span className="text-[#9CA3AF] w-16 flex-shrink-0">
                  {log.time}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${levelColors[log.level]}`}
                >
                  {log.level}
                </span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[#374151]">
                  {log.msg}
                </span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
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
