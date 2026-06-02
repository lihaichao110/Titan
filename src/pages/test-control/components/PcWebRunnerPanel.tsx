import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Globe2, Play, RotateCw } from "lucide-react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { useExecutionStore } from "@/store/test-control";
import type {
  BrowserBounds,
  ExecutionStep,
  PcWebRunResult,
  PcWebRunnerEvent,
  PcWebStep,
} from "@/types/test-control";

const PC_BROWSER_VIEWPORT = {
  width: 1440,
  height: 900,
};

// 这 4 步顺序与后端 PC Web 执行事件严格对应，清理时不要合并或重排。
const defaultSteps: PcWebStep[] = [
  {
    step: 1,
    name: "加载登录页",
    kind: "assert",
    instruction:
      "CodeVortex 登录页已经加载完成，页面上能看到用户名和密码输入框",
  },
  {
    step: 2,
    name: "输入账号密码",
    kind: "act",
    instruction: "在登录页输入测试账号 test_user 和测试密码 test_password",
  },
  {
    step: 3,
    name: "点击登录",
    kind: "act",
    instruction: "点击登录按钮提交表单",
  },
  {
    step: 4,
    name: "验证进入后台首页",
    kind: "assert",
    instruction: "登录后已经进入 CodeVortex 后台首页",
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
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

function formatRuntimeTime(elapsedMs: number) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function PcWebRunnerPanel() {
  const {
    setScreenshot,
    setExecutionSteps,
    setRuntimeTime,
    updateStepResult,
    addLog,
    clearLogs,
  } = useExecutionStore();
  const [url, setUrl] = useState("https://intra.lihaichao.cn/login");
  const [running, setRunning] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [browserReady, setBrowserReady] = useState(false);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const browserHostRef = useRef<HTMLDivElement | null>(null);
  const initialUrlRef = useRef(url);
  const animationFrameRef = useRef<number | null>(null);
  const runtimeIntervalRef = useRef<number | null>(null);
  // 命令直接失败时才兜底标失败，避免已有 step 事件后覆盖真实执行状态。
  const hasStepEventRef = useRef(false);
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

  const syncBrowserBounds = useCallback(
    async (nextBounds?: BrowserBounds) => {
      const bounds = nextBounds ?? getBrowserBounds();
      if (!bounds) return;

      try {
        await invoke("set_pc_browser_bounds", { bounds });
        setBrowserError(null);
      } catch (error) {
        setBrowserError(error instanceof Error ? error.message : String(error));
      }
    },
    [getBrowserBounds],
  );

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
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listen<PcWebRunnerEvent>("pc-web-runner-event", ({ payload }) => {
      if (payload.event === "log") {
        addLog(payload.payload);
        return;
      }

      if (payload.event === "step") {
        // StepListView 的步骤状态只由后端 step 事件推进，不要改成最终结果批量回写。
        hasStepEventRef.current = true;
        updateStepResult(payload.payload.step, payload.payload);
        return;
      }

      if (payload.event === "screenshot") {
        setScreenshot(payload.payload.screenshot);
        return;
      }

      setErrorText(
        payload.payload.success
          ? null
          : payload.payload.error || "测试执行失败",
      );
      if (payload.payload.screenshot) {
        setScreenshot(payload.payload.screenshot);
      }
    }).then((handler) => {
      if (disposed) {
        handler();
        return;
      }

      unlisten = handler;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [addLog, setScreenshot, updateStepResult]);

  useEffect(() => {
    setExecutionSteps(executionSteps);
  }, [executionSteps, setExecutionSteps]);

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
        await invoke("create_pc_browser", {
          url: initialUrlRef.current,
          bounds,
        });
        await invoke("show_pc_browser");
        await syncBrowserBounds(bounds);
        if (!disposed) {
          setBrowserReady(true);
          setBrowserError(null);
        }
      } catch (error) {
        if (!disposed) {
          setBrowserReady(false);
          setBrowserError(
            error instanceof Error ? error.message : String(error),
          );
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
      if (runtimeIntervalRef.current !== null) {
        window.clearInterval(runtimeIntervalRef.current);
        runtimeIntervalRef.current = null;
      }
      void invoke("hide_pc_browser");
    };
  }, [getBrowserBounds, scheduleSyncBrowserBounds, syncBrowserBounds]);

  const navigateBrowser = async (targetUrl: string) => {
    const normalizedUrl = normalizeUrl(targetUrl);
    if (!normalizedUrl) {
      const message = "请输入有效的 URL";
      setBrowserError(message);
      throw new Error(message);
    }

    const bounds = getBrowserBounds();
    if (!browserReady && !bounds) {
      const message = "浏览器容器未准备好";
      setBrowserError(message);
      throw new Error(message);
    }

    try {
      if (browserReady) {
        await invoke("navigate_pc_browser", { url: normalizedUrl });
        await invoke("show_pc_browser");
      } else if (bounds) {
        await invoke("create_pc_browser", { url: normalizedUrl, bounds });
        await invoke("show_pc_browser");
        setBrowserReady(true);
      }
      await syncBrowserBounds(bounds ?? undefined);
      setBrowserError(null);
      return normalizedUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setBrowserError(message);
      throw new Error(message);
    }
  };

  const runTest = async () => {
    const targetUrl = normalizeUrl(url);
    if (!targetUrl) {
      setErrorText("请输入有效的 URL");
      return;
    }

    setRunning(true);
    setErrorText(null);
    setRuntimeTime("00:00:00");
    clearLogs();
    setScreenshot("");
    setExecutionSteps(executionSteps);
    hasStepEventRef.current = false;
    const runtimeStartedAt = Date.now();
    if (runtimeIntervalRef.current !== null) {
      window.clearInterval(runtimeIntervalRef.current);
    }
    runtimeIntervalRef.current = window.setInterval(() => {
      setRuntimeTime(formatRuntimeTime(Date.now() - runtimeStartedAt));
    }, 1000);

    try {
      await navigateBrowser(targetUrl);

      addLog({
        time: new Date().toTimeString().slice(0, 8),
        level: "INFO",
        msg: `开始执行 PC Web 测试: ${targetUrl}`,
      });

      const result = await invoke<PcWebRunResult>("run_pc_web_test", {
        request: {
          url: targetUrl,
          steps: defaultSteps,
        },
      });

      // 不要在这里批量回写 result.steps，否则 4 个步骤会看起来一次性完成。
      if (result.screenshot) {
        setScreenshot(result.screenshot);
      }
      setErrorText(result.success ? null : result.error || "测试执行失败");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!hasStepEventRef.current) {
        updateStepResult(defaultSteps[0].step, {
          status: "failed",
          duration: "00:00:00",
          detail: message,
        });
      }
      addLog({
        time: new Date().toTimeString().slice(0, 8),
        level: "ERROR",
        msg: message,
      });
      setErrorText(message);
    } finally {
      if (runtimeIntervalRef.current !== null) {
        window.clearInterval(runtimeIntervalRef.current);
        runtimeIntervalRef.current = null;
      }
      setRuntimeTime(formatRuntimeTime(Date.now() - runtimeStartedAt));
      setRunning(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] overflow-hidden">
      <div className="h-14 px-6 flex items-center justify-between border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <Globe2 className="w-4 h-4 text-[#6B7280]" />
          <span className="text-sm font-medium text-[#1F2937]">
            PC Web 自动化
          </span>
          <div
            className={`w-2 h-2 rounded-full ${running ? "bg-blue-500" : errorText ? "bg-red-500" : "bg-green-500"}`}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={runTest}
          disabled={running}
        >
          <RotateCw
            className={`w-4 h-4 text-[#6B7280] ${running ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <div className="px-5 py-4 border-b border-[#E5E7EB] bg-[#FAFBFC]">
        <div className="flex items-center gap-3">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void runTest();
              }
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
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        <div
          ref={browserHostRef}
          className="w-full h-full overflow-hidden bg-[#F5F7FB] border border-[#E5E7EB]"
        >
          {!browserReady || browserError ? (
            <div className="w-full h-full flex items-center justify-center px-4 text-center">
              <span
                className={`text-sm ${browserError ? "text-[#EF4444]" : "text-[#9CA3AF]"}`}
              >
                {browserError || "正在加载 PC 浏览器..."}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
