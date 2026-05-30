import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { RefreshCw, Smartphone, Usb } from "lucide-react";
import { useExecutionStore } from "../store/executionStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IOSDevice {
  udid: string;
  name: string;
}

interface ScreenStreamInfo {
  sessionUrl: string;
  streamUrl: string;
  udid: string;
  mjpegPort: number;
}

type StreamStatus = "idle" | "connecting" | "connected" | "fallback" | "error";

export function DeviceSimulator() {
  const {
    currentScreenshot,
    deviceUrl,
    setScreenshot,
    deviceType,
    setDeviceUrl,
  } = useExecutionStore();
  const [devices, setDevices] = useState<IOSDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
  const [streamError, setStreamError] = useState<string | null>(null);
  const swipeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const swipeCountRef = useRef(0);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handlePair = async () => {
    setPairing(true);
    try {
      await invoke("pair_device");
      await fetchDevices();
    } catch (e) {
      console.error("Failed to pair device:", e);
    } finally {
      setPairing(false);
    }
  };

  const performSwipe = useCallback(async () => {
    if (!deviceUrl) return;
    try {
      await invoke("swipe", {
        x1: 0.5,
        y1: 0.8,
        x2: 0.5,
        y2: 0.2,
        duration: 0.5,
        udid: deviceUrl,
      });
    } catch (e) {
      console.error("Failed to perform swipe:", e);
    }
  }, [deviceUrl]);

  const startSwipeSequence = useCallback(() => {
    console.log("Starting swipe sequence");
    if (swipeTimerRef.current) {
      clearInterval(swipeTimerRef.current);
    }
    swipeCountRef.current = 0;

    const runSwipe = () => {
      console.log("Performing swipe");
      swipeCountRef.current += 1;
      performSwipe();
      if (swipeCountRef.current >= 3) {
        if (swipeTimerRef.current) {
          clearInterval(swipeTimerRef.current);
          swipeTimerRef.current = null;
        }
      }
    };

    runSwipe();
    swipeTimerRef.current = setInterval(runSwipe, 3000);
  }, [performSwipe]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const result = await invoke<IOSDevice[]>("list_devices");
      setDevices(result);
    } catch (e) {
      console.error("Failed to list devices:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceConnect = async (udid: string) => {
    if (udid === "none") return;
    setDeviceUrl(udid);
  };

  const stopFallbackStream = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const fetchFallbackScreenshot = useCallback(async (udid: string) => {
    try {
      const screenshot = await invoke<string>("get_screenshot", { udid });
      setScreenshot(screenshot);
      setConnected(true);
      return true;
    } catch (error) {
      console.error("Failed to fetch fallback screenshot:", error);
      setConnected(false);
      return false;
    }
  }, [setScreenshot]);

  const startFallbackStream = useCallback(async (udid: string) => {
    stopFallbackStream();
    setStreamStatus("fallback");
    const loaded = await fetchFallbackScreenshot(udid);
    if (!loaded) return;

    fallbackTimerRef.current = setInterval(() => {
      fetchFallbackScreenshot(udid);
    }, 1500);
  }, [fetchFallbackScreenshot, stopFallbackStream]);

  const startScreenStream = useCallback(async () => {
    if (!deviceUrl) return;

    stopFallbackStream();
    setStreamStatus("connecting");
    setStreamError(null);
    setIsRefreshing(true);
    setConnected(false);
    try {
      const streamInfo = await invoke<ScreenStreamInfo>("start_screen_stream", {
        udid: deviceUrl,
      });
      setStreamUrl(`${streamInfo.streamUrl}?t=${Date.now()}`);
      setScreenshot("");
      setStreamStatus("connected");
      setConnected(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to start screen stream:", error);
      setStreamUrl("");
      setStreamError(message);
      setConnected(false);
      await startFallbackStream(deviceUrl);
    } finally {
      setIsRefreshing(false);
    }
  }, [deviceUrl, setScreenshot, startFallbackStream, stopFallbackStream]);

  // Initial fetch
  useEffect(() => {
    fetchDevices();
  }, []);

  // Start the MJPEG stream when a device is selected.
  useEffect(() => {
    if (deviceUrl) {
      startScreenStream();
    } else {
      stopFallbackStream();
      setStreamUrl("");
      setStreamStatus("idle");
      setStreamError(null);
      setConnected(false);
    }
  }, [deviceUrl, startScreenStream, stopFallbackStream]);

  useEffect(() => {
    return () => stopFallbackStream();
  }, [stopFallbackStream]);

  // Trigger swipe sequence only when the WDA stream is available.
  useEffect(() => {
    if (connected && deviceUrl && streamStatus === "connected") {
      startSwipeSequence();
    }
    return () => {
      if (swipeTimerRef.current) {
        clearInterval(swipeTimerRef.current);
        swipeTimerRef.current = null;
      }
    };
  }, [connected, deviceUrl, startSwipeSequence, streamStatus]);

  return (
    <div className="h-[700px] flex flex-col bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] overflow-hidden">
      {/* Top toolbar */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <Smartphone className="w-4 h-4 text-[#6B7280]" />
          <span className="text-sm font-medium text-[#1F2937]">iOS 设备</span>
          <div
            className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
          />
        </div>

        {/* Device selector */}
        {deviceType === "mobile" && (
          <div className="flex items-center gap-2">
            <Select
              value={deviceUrl || "none"}
              onValueChange={(v) => handleDeviceConnect(v)}
            >
              <SelectTrigger className="w-48 h-8 bg-[#F9FAFB] border-[#E5E7EB] text-sm">
                <SelectValue
                  placeholder={loading ? "扫描设备中..." : "选择iOS设备"}
                />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: "white" }}>
                {devices.length === 0 && !loading && (
                  <SelectItem value="none" disabled>
                    <div className="flex items-center gap-2">
                      <Usb className="w-4 h-4 text-[#9CA3AF]" />
                      未检测到设备
                    </div>
                  </SelectItem>
                )}
                {devices.map((d) => (
                  <SelectItem key={d.udid} value={d.udid}>
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      {d.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {devices.length === 0 && !loading && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handlePair}
                disabled={pairing}
              >
                {pairing ? "配对中..." : "点击配对"}
              </Button>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={startScreenStream}
          disabled={!deviceUrl || isRefreshing}
        >
          <RefreshCw
            className={`w-4 h-4 text-[#6B7280] ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* Screen Content */}
      <div className="flex-1 p-4 overflow-hidden">
        {streamUrl && streamStatus !== "error" ? (
          <img
            src={streamUrl}
            alt="Device Screen Stream"
            className="w-full h-full object-contain"
            onLoad={() => {
              setStreamStatus("connected");
              setConnected(true);
            }}
            onError={() => {
              setStreamStatus("error");
              setStreamError("投屏流连接失败，请检查 WDA 和设备连接后重试。");
              setConnected(false);
            }}
          />
        ) : currentScreenshot ? (
          <img
            src={currentScreenshot}
            alt="Device Screen Fallback"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#F5F7FB]">
            <Smartphone className="w-12 h-12 text-[#D1D5DB] mb-2" />
            <span className="text-sm text-[#9CA3AF]">
              {streamStatus === "connecting"
                ? "正在连接投屏..."
                : streamStatus === "fallback"
                  ? "WDA 不可用，使用截图投屏..."
                : streamStatus === "error"
                  ? streamError || "投屏连接失败"
                  : "等待连接..."}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
