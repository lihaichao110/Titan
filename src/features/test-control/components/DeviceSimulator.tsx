import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ZoomIn, ZoomOut, RotateCcw, Camera, Smartphone, Expand, Minimize, Move } from 'lucide-react';
import { useExecutionStore } from '../store/executionStore';

export function DeviceSimulator() {
  const { context } = useExecutionStore();
  const { stats } = context;

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-slate-200">
      {/* Top toolbar */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-900">{stats.runtime.device}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Expand className="w-4 h-4 text-slate-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Minimize className="w-4 h-4 text-slate-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <RotateCcw className="w-4 h-4 text-slate-600" />
          </Button>
        </div>
      </div>

      {/* Device Frame */}
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="relative w-[260px] h-[560px] bg-slate-900 rounded-[40px] p-2 shadow-xl">
          <div className="w-full h-full bg-white rounded-[32px] overflow-hidden">
            {/* Notch */}
            <div className="h-8 bg-slate-900 flex items-center justify-center">
              <div className="w-20 h-6 bg-black rounded-full" />
            </div>

            {/* App Content */}
            <div className="p-6 flex flex-col h-full">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 text-center mt-4">欢迎回来</h2>

                <div className="mt-8 space-y-4">
                  <div className="bg-slate-100 rounded-xl p-4">
                    <label className="text-xs text-slate-500 mb-1 block">手机号码</label>
                    <div className="text-sm text-slate-400">请输入手机号码</div>
                  </div>

                  <div className="bg-slate-100 rounded-xl p-4">
                    <label className="text-xs text-slate-500 mb-1 block">密码</label>
                    <div className="text-sm text-slate-400">请输入密码</div>
                  </div>
                </div>

                <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700">登录</Button>

                {/* Third-party login */}
                <div className="mt-6 flex items-center justify-center gap-4">
                  {['微信', 'QQ', 'Apple'].map((provider) => (
                    <div
                      key={provider}
                      className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"
                    >
                      <span className="text-xs text-slate-600">{provider[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-400 rounded-full" />
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="px-4 py-3 border-t border-slate-200">
        <Separator className="mb-3" />
        <div className="flex items-center justify-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-slate-600 w-12 text-center font-medium">100%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-slate-200" />
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Camera className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Move className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}