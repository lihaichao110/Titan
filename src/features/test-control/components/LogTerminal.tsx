import { useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { useExecutionStore } from '../store/executionStore';
import type { LogLevel } from '../types';

const levelColors: Record<LogLevel, string> = {
  INFO: 'text-blue-500',
  SUCCESS: 'text-emerald-500',
  ERROR: 'text-red-500',
};

export function LogTerminal() {
  const { context, logFilter, autoScroll, setLogFilter, setAutoScroll } = useExecutionStore();
  const { logs } = context;
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logFilter === 'ALL' ? logs : logs.filter((l) => l.level === logFilter);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  return (
    <div className="h-full flex flex-col bg-slate-50 rounded-lg border border-slate-200">
      <div className="px-4 py-3 border-b border-slate-200 bg-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-900">实时日志</h3>

          <div className="flex items-center gap-4">
            <Select value={logFilter} onValueChange={(v) => setLogFilter(v as LogLevel | 'ALL')}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部</SelectItem>
                <SelectItem value="INFO">INFO</SelectItem>
                <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                <SelectItem value="ERROR">ERROR</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch id="auto-scroll" checked={autoScroll} onCheckedChange={setAutoScroll} />
              <Label htmlFor="auto-scroll" className="text-xs text-slate-600">
                自动滚动
              </Label>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-2 py-2" ref={scrollRef}>
        <div className="font-mono text-xs space-y-1">
          {filteredLogs.map((log, index) => (
            <div key={index} className="flex items-start gap-2 px-2 py-1 hover:bg-slate-100 rounded">
              <span className="text-slate-400">{log.timestamp}</span>
              <span className={`font-medium ${levelColors[log.level]}`}>[{log.level}]</span>
              <span className="text-slate-700">{log.message}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}