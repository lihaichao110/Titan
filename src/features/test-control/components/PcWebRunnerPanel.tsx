import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Globe2, Play, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExecutionStore } from "../store/executionStore";
import type { ExecutionStep, LogEntry, StepStatus } from "../types";

type PcWebStepKind = "act" | "assert";

interface PcWebStep {
  step: number;
  name: string;
  kind: PcWebStepKind;
  instruction: string;
}

interface PcWebStepResult {
  step: number;
  status: StepStatus;
  duration: string;
  detail: string;
}

interface PcWebRunResult {
  success: boolean;
  steps: PcWebStepResult[];
  logs: LogEntry[];
  screenshot?: string | null;
  error?: string | null;
}

interface BrowserBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

type PcWebRunnerEvent =
  | { event: "log"; payload: LogEntry }
  | { event: "step"; payload: Partial<PcWebStepResult> & { step: number } }
  | { event: "screenshot"; payload: { screenshot: string } }
  | { event: "result"; payload: PcWebRunResult };

const PC_BROWSER_VIEWPORT = {
  width: 1440,
  height: 900,
};

const defaultSteps: PcWebStep[] = [
  {
    step: 1,
    name: "等待百度首页加载",
    kind: "assert",
    instruction: "百度首页已经加载完成，页面上能看到搜索框",
  },
  {
    step: 2,
    name: "搜索今日新闻",
    kind: "act",
    instruction: "在百度搜索框输入“今日新闻”，并提交搜索",
  },
  {
    step: 3,
    name: "验证搜索结果",
    kind: "assert",
    instruction: "搜索结果页已经加载完成，页面上能看到与“今日新闻”相关的结果列表",
  },
  {
    step: 4,
    name: "查看第一条新闻",
    kind: "act",
    instruction: "点击搜索结果中的第一条新闻或资讯结果，并确认已经进入新闻详情页或新闻来源页面",
  },
];

function toExecutionSteps(steps: PcWebStep[]): ExecutionStep[] {
  return steps.map((step) => ({
    step: step.step,
    name: step.name,
    locator: step.instruction,
    status: "pending",
    duration: null,
  }));
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

export function PcWebRunnerPanel() {
  const {
    setScreenshot,
    setExecutionSteps,
    updateStepStatus,
    updateStepResult,
    addLog,
    clearLogs,
  } = useExecutionStore();
  const [url, setUrl] = useState("https://www.baidu.com");
  const [running, setRunning] = useState(false);
  const [statusText, setStatusText] = useState("等待执行 PC Web 测试");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [browserReady, setBrowserReady] = useState(false);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const browserHostRef = useRef<HTMLDivElement | null>(null);
  const initialUrlRef = useRef(url);
  const animationFrameRef = useRef<number | null>(null);
  const executionSteps = useMemo(() => toExecutionSteps(defaultSteps), []);

  const getBrowserBounds = useCallback((): BrowserBounds | null => {
    const host = browserHostRef.current;
    if (!host) return null;

    const rect = host.getBoundingClientRect();
    const hostWidth = host.clientWidth;
    const hostHeight = host.clientHeight;
    if (hostWidth <= 0 || hostHeight <= 0) return null;

    const zoom = Math.min(
      hostWidth / PC_BROWSER_VIEWPORT.width,
      hostHeight / PC_BROWSER_VIEWPORT.height,
      1,
    );
    const width = PC_BROWSER_VIEWPORT.width * zoom;
    const height = PC_BROWSER_VIEWPORT.height * zoom;

    return {
      x: rect.left + host.clientLeft + (hostWidth - width) / 2,
      y: rect.top + host.clientTop + (hostHeight - height) / 2,
      width,
      height,
      zoom,
    };
  }, []);

  const syncBrowserBounds = useCallback(async () => {
    const bounds = getBrowserBounds();
    if (!bounds) return;

    try {
      await invoke("set_pc_browser_bounds", { bounds });
      setBrowserError(null);
    } catch (error) {
      setBrowserError(error instanceof Error ? error.message : String(error));
    }
  }, [getBrowserBounds]);

  const scheduleSyncBrowserBounds = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      void syncBrowserBounds();
    });
  }, [syncBrowserBounds]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<PcWebRunnerEvent>("pc-web-runner-event", ({ payload }) => {
      if (payload.event === "log") {
        addLog(payload.payload);
        return;
      }

      if (payload.event === "step") {
        updateStepResult(payload.payload.step, payload.payload);
        return;
      }

      if (payload.event === "screenshot") {
        setScreenshot(payload.payload.screenshot);
        return;
      }

      setStatusText(payload.payload.success ? "PC Web 测试执行完成" : "PC Web 测试执行失败");
      setErrorText(payload.payload.success ? null : payload.payload.error || "测试执行失败");
      if (payload.payload.screenshot) {
        setScreenshot(payload.payload.screenshot);
      }
    }).then((handler) => {
      unlisten = handler;
    });

    return () => {
      unlisten?.();
    };
  }, [addLog, setScreenshot, updateStepResult]);

  useEffect(() => {
    let disposed = false;
    let retryTimeout: number | null = null;
    const createBrowser = async () => {
      const bounds = getBrowserBounds();
      if (!bounds) {
        retryTimeout = window.setTimeout(createBrowser, 50);
        return;
      }

      try {
        await invoke("create_pc_browser", { url: initialUrlRef.current, bounds });
        if (!disposed) {
          setBrowserReady(true);
          setBrowserError(null);
        }
      } catch (error) {
        if (!disposed) {
          setBrowserReady(false);
          setBrowserError(error instanceof Error ? error.message : String(error));
        }
      }
    };

    const timeout = window.setTimeout(createBrowser, 0);
    const resizeObserver = new ResizeObserver(scheduleSyncBrowserBounds);
    if (browserHostRef.current) {
      resizeObserver.observe(browserHostRef.current);
    }
    window.addEventListener("resize", scheduleSyncBrowserBounds);
    window.addEventListener("scroll", scheduleSyncBrowserBounds, true);

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      if (retryTimeout !== null) {
        window.clearTimeout(retryTimeout);
      }
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleSyncBrowserBounds);
      window.removeEventListener("scroll", scheduleSyncBrowserBounds, true);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      void invoke("hide_pc_browser");
    };
  }, [getBrowserBounds, scheduleSyncBrowserBounds]);

  const navigateBrowser = async (targetUrl: string) => {
    const normalizedUrl = normalizeUrl(targetUrl);
    if (!normalizedUrl) {
      setBrowserError("请输入有效的 URL");
      return null;
    }

    const bounds = getBrowserBounds();
    try {
      if (browserReady) {
        await invoke("navigate_pc_browser", { url: normalizedUrl });
      } else if (bounds) {
        await invoke("create_pc_browser", { url: normalizedUrl, bounds });
        setBrowserReady(true);
      }
      await syncBrowserBounds();
      setBrowserError(null);
      return normalizedUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setBrowserError(message);
      return null;
    }
  };

  const runTest = async () => {
    const targetUrl = normalizeUrl(url);
    if (!targetUrl) {
      setErrorText("请输入有效的 URL");
      setStatusText("URL 无效");
      return;
    }

    await navigateBrowser(targetUrl);
    setRunning(true);
    setErrorText(null);
    setStatusText("正在启动浏览器...");
    clearLogs();
    setScreenshot("");
    setExecutionSteps(executionSteps);
    updateStepStatus(defaultSteps[0].step, "executing");
    addLog({
      time: new Date().toTimeString().slice(0, 8),
      level: "INFO",
      msg: `开始执行 PC Web 测试: ${targetUrl}`,
    });

    try {
      const result = await invoke<PcWebRunResult>("run_pc_web_test", {
        request: {
          url: targetUrl,
          steps: defaultSteps,
        },
      });

      result.steps.forEach((step) => {
        updateStepResult(step.step, {
          status: step.status,
          duration: step.duration,
          detail: step.detail,
        });
      });
      if (result.screenshot) {
        setScreenshot(result.screenshot);
      }
      setStatusText(result.success ? "PC Web 测试执行完成" : "PC Web 测试执行失败");
      setErrorText(result.success ? null : result.error || "测试执行失败");
      await navigateBrowser(targetUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updateStepResult(defaultSteps[0].step, {
        status: "failed",
        duration: "00:00:00",
        detail: message,
      });
      addLog({
        time: new Date().toTimeString().slice(0, 8),
        level: "ERROR",
        msg: message,
      });
      setStatusText("PC Web 测试执行失败");
      setErrorText(message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] overflow-hidden">
      <div className="h-14 px-6 flex items-center justify-between border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <Globe2 className="w-4 h-4 text-[#6B7280]" />
          <span className="text-sm font-medium text-[#1F2937]">PC Web 自动化</span>
          <div className={`w-2 h-2 rounded-full ${running ? "bg-blue-500" : errorText ? "bg-red-500" : "bg-green-500"}`} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={runTest}
          disabled={running}
        >
          <RotateCw className={`w-4 h-4 text-[#6B7280] ${running ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="px-5 py-4 border-b border-[#E5E7EB] bg-[#FAFBFC]">
        <div className="flex items-center gap-3">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void navigateBrowser(url);
              }
            }}
            onBlur={() => {
              void navigateBrowser(url);
            }}
            placeholder="https://www.baidu.com"
            className="h-9 bg-white"
            disabled={running}
          />
          <Button
            className="h-9 bg-[#2563FF] hover:bg-[#1D4ED8] text-white"
            onClick={runTest}
            disabled={running}
          >
            <Play className="w-4 h-4 mr-1.5" />
            执行
          </Button>
        </div>
        <div className={`mt-2 text-xs ${errorText || browserError ? "text-[#EF4444]" : "text-[#6B7280]"}`}>
          {errorText || browserError || statusText}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        <div
          ref={browserHostRef}
          className="w-full h-full overflow-hidden bg-[#F5F7FB] border border-[#E5E7EB]"
        >
          {!browserReady || browserError ? (
            <div className="w-full h-full flex items-center justify-center px-4 text-center">
              <span className={`text-sm ${browserError ? "text-[#EF4444]" : "text-[#9CA3AF]"}`}>
                {browserError || "正在加载 PC 浏览器..."}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
