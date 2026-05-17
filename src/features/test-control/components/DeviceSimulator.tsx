import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ZoomIn, ZoomOut, RotateCcw, Camera, Smartphone, Expand, Minimize, Move } from 'lucide-react';
import { useExecutionStore } from '../store/executionStore';

export function DeviceSimulator() {
  const { context } = useExecutionStore();
  const { stats } = context;

  return (
    <div className="h-[640px] flex flex-col bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04)] border border-[#E5E7EB] overflow-hidden">
      {/* Top toolbar */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-[#6B7280]" />
          <span className="text-sm font-medium text-[#1F2937]">{stats.runtime.device}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Expand className="w-4 h-4 text-[#6B7280]" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Minimize className="w-4 h-4 text-[#6B7280]" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <RotateCcw className="w-4 h-4 text-[#6B7280]" />
          </Button>
        </div>
      </div>

      {/* Device Frame - 缩小5% */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative w-[228px] h-[456px] bg-[#1F2937] rounded-[36px] p-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <div className="w-full h-full bg-white rounded-[30px] overflow-hidden">
            {/* Notch */}
            <div className="h-7 bg-[#1F2937] flex items-center justify-center">
              <div className="w-16 h-5 bg-black rounded-full" />
            </div>

            {/* App Content */}
            <div className="p-4 flex flex-col h-full">
              <div className="flex-1 flex flex-col">
                <h2 className="text-base font-bold text-[#1F2937] text-center mt-3">欢迎回来</h2>

                <div className="mt-5 space-y-3">
                  <div className="bg-[#F9FAFB] rounded-xl p-3">
                    <label className="text-xs text-[#9CA3AF] mb-1 block">手机号码</label>
                    <div className="text-sm text-[#D1D5DB]">请输入手机号码</div>
                  </div>

                  <div className="bg-[#F9FAFB] rounded-xl p-3">
                    <label className="text-xs text-[#9CA3AF] mb-1 block">密码</label>
                    <div className="text-sm text-[#D1D5DB]">请输入密码</div>
                  </div>
                </div>

                <Button className="w-full mt-4 bg-[#2563FF] hover:bg-[#1D4ED8] text-white text-sm h-9">
                  登录
                </Button>

                {/* Third-party login */}
                <div className="mt-4 flex items-center justify-center gap-3">
                  {['微信', 'QQ', 'Apple'].map((provider) => (
                    <div
                      key={provider}
                      className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center"
                    >
                      <span className="text-xs text-[#6B7280]">{provider[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-24 h-0.5 bg-[#D1D5DB] rounded-full" />
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="h-14 px-6 flex items-center border-t border-[#E5E7EB]">
        <Separator className="mb-2" />
        <div className="flex items-center justify-center gap-3 w-full">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ZoomOut className="w-4 h-4 text-[#6B7280]" />
          </Button>
          <span className="text-xs text-[#6B7280] w-12 text-center font-medium">100%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ZoomIn className="w-4 h-4 text-[#6B7280]" />
          </Button>
          <div className="w-px h-4 bg-[#E5E7EB] mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Camera className="w-4 h-4 text-[#6B7280]" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <RotateCcw className="w-4 h-4 text-[#6B7280]" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Move className="w-4 h-4 text-[#6B7280]" />
          </Button>
        </div>
      </div>
    </div>
  );
}