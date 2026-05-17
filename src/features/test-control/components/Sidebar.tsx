import {
  PlaySquare,
  CheckSquare,
  Code,
  Server,
  FileText,
  Link,
  Folder,
  Settings,
} from 'lucide-react';
import { useExecutionStore } from '../store/executionStore';

const iconMap: Record<string, typeof PlaySquare> = {
  PlaySquare,
  CheckSquare,
  Code,
  Server,
  FileText,
  Link,
  Folder,
  Settings,
};

const menuItems = [
  { id: 'control', name: '测试控制台', icon: 'PlaySquare' },
  { id: 'tasks', name: '测试任务', icon: 'CheckSquare' },
  { id: 'scripts', name: '测试编排', icon: 'Code' },
  { id: 'devices', name: '设备管理', icon: 'Server' },
  { id: 'reports', name: '测试报告', icon: 'FileText' },
  { id: 'api', name: '接口管理', icon: 'Link' },
  { id: 'projects', name: '项目管理', icon: 'Folder' },
  { id: 'settings', name: '设置中心', icon: 'Settings' },
];

export function Sidebar() {
  const { activeMenuId, setActiveMenu } = useExecutionStore();

  return (
    <div className="h-full bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Titan</div>
            <div className="text-slate-500 text-xs">自动化测试平台</div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = activeMenuId === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User profile */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=TestMaster"
            alt="avatar"
            className="w-8 h-8 rounded-full bg-slate-700"
          />
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate">TestMaster</div>
            <div className="text-slate-500 text-xs">管理员</div>
          </div>
        </div>
      </div>
    </div>
  );
}