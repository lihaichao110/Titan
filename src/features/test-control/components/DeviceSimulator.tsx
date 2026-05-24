import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { RefreshCw, Smartphone, Usb } from 'lucide-react';
import { useExecutionStore } from '../store/executionStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface IOSDevice {
  udid: string;
  name: string;
}

export function DeviceSimulator() {
  const { currentScreenshot, deviceUrl, setScreenshot, deviceType, setDeviceUrl } = useExecutionStore();
  const [devices, setDevices] = useState<IOSDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const result = await invoke<IOSDevice[]>('list_devices');
      setDevices(result);
    } catch (e) {
      console.error('Failed to list devices:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceConnect = async (udid: string) => {
    setDeviceUrl(udid);
  };

  const fetchScreenshot = useCallback(async () => {
    if (!deviceUrl) return;

    setIsRefreshing(true);
    try {
      const screenshot = await invoke<string>('get_screenshot', {
        udid: deviceUrl,
      });
      setScreenshot(screenshot);
      setConnected(true);
    } catch (error) {
      console.error('Failed to fetch screenshot:', error);
      setConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [deviceUrl, setScreenshot]);

  // Initial fetch
  useEffect(() => {
    fetchDevices();
  }, []);

  // Initial fetch and auto refresh
  useEffect(() => {
    if (deviceUrl) {
      fetchScreenshot();
    }
  }, [deviceUrl]);

  // Auto refresh every 3 seconds
  useEffect(() => {
    if (!deviceUrl) return;
    const interval = setInterval(fetchScreenshot, 3000);
    return () => clearInterval(interval);
  }, [deviceUrl, fetchScreenshot]);

  return (
    <div className="h-[700px] flex flex-col bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] overflow-hidden">
      {/* Top toolbar */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <Smartphone className="w-4 h-4 text-[#6B7280]" />
          <span className="text-sm font-medium text-[#1F2937]">iOS 设备</span>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>

        {/* Device selector */}
        {deviceType === 'mobile' && (
          <Select value={deviceUrl || 'none'} onValueChange={(v) => handleDeviceConnect(v)}>
            <SelectTrigger className="w-48 h-8 bg-[#F9FAFB] border-[#E5E7EB] text-sm">
              <SelectValue placeholder={loading ? '扫描设备中...' : '选择iOS设备'} />
            </SelectTrigger>
            <SelectContent style={{ backgroundColor: 'white' }}>
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
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={fetchScreenshot}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 text-[#6B7280] ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Screen Content */}
      <div className="flex-1 p-4 overflow-hidden">
        {currentScreenshot ? (
          <img
            src={currentScreenshot}
            alt="Device Screen"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#F5F7FB]">
            <Smartphone className="w-12 h-12 text-[#D1D5DB] mb-2" />
            <span className="text-sm text-[#9CA3AF]">
              {connected ? '加载中...' : '等待连接...'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}