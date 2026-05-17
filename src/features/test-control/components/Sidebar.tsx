import { PlaySquare, ListTodo, GitBranch, Database, FileText, Cloud, Box, Settings } from 'lucide-react';
import { useExecutionStore } from '../store/executionStore';

const iconMap: Record<string, typeof PlaySquare> = {
  PlaySquare,
  ListTodo,
  GitBranch,
  Database,
  FileText,
  Cloud,
  Box,
  Settings,
};

const menuItems = [
  { id: 'test_control', label: '测试控制台', icon: 'PlaySquare' },
  { id: 'tasks', label: '测试任务', icon: 'ListTodo' },
  { id: 'scripts', label: '测试编排', icon: 'GitBranch' },
  { id: 'devices', label: '设备管理', icon: 'Database' },
  { id: 'reports', label: '测试报告', icon: 'FileText' },
  { id: 'api_mgmt', label: '接口管理', icon: 'Cloud' },
  { id: 'projects', label: '项目管理', icon: 'Box' },
  { id: 'settings', label: '设置中心', icon: 'Settings' },
];

export function Sidebar() {
  const { activeMenuId, setActiveMenu } = useExecutionStore();

  return (
    <div className="h-full bg-slate-900 flex flex-col">
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
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

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