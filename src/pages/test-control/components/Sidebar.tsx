import { useNavigate, useLocation } from "react-router-dom";
import {
  PlaySquare,
  CheckSquare,
  Code,
  Server,
  FileText,
  Link,
  Folder,
  Settings,
} from "lucide-react";
import { useExecutionStore } from "@/store/test-control";

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
  { id: "tasks", name: "测试任务", icon: "CheckSquare", path: "/" },
  { id: "control", name: "测试控制台", icon: "PlaySquare", path: "/test-control" },
  { id: "scripts", name: "测试编排", icon: "Code", path: "/scripts" },
  { id: "devices", name: "设备管理", icon: "Server", path: "/devices" },
  { id: "reports", name: "测试报告", icon: "FileText", path: "/reports" },
  { id: "api", name: "接口管理", icon: "Link", path: "/api" },
  { id: "projects", name: "项目管理", icon: "Folder", path: "/projects" },
  { id: "settings", name: "设置中心", icon: "Settings", path: "/settings" },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveMenu } = useExecutionStore();

  const handleMenuClick = (item: typeof menuItems[0]) => {
    setActiveMenu(item.id);
    navigate(item.path);
  };

  return (
    <div className="fixed left-0 top-0 bottom-0 w-[220px] bg-white flex flex-col border-r border-[#E5E7EB] z-50 overflow-hidden">
      {/* Logo */}
      <div className="h-[84px] flex items-center pl-6 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563FF] flex items-center justify-center">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <div>
            <div className="text-[#1F2937] font-semibold text-base">Titan</div>
            <div className="text-[#9CA3AF] text-xs">自动化测试平台</div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = location.pathname === item.path;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleMenuClick(item)}
                  className={`w-full h-11 flex items-center gap-3 px-3 rounded-xl text-sm transition-all ${
                    isActive
                      ? "bg-[#2563FF] text-white"
                      : "text-[#374151] hover:bg-[#F0F5FF]"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span>{item.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User profile */}
      <div className="h-[72px] flex items-center px-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="flex items-center gap-3">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=TestMaster"
            alt="avatar"
            className="w-10 h-10 rounded-xl bg-[#E5E7EB]"
          />
          <div className="min-w-0">
            <div className="text-[#1F2937] text-sm font-medium truncate">
              TestMaster
            </div>
            <div className="text-[#9CA3AF] text-xs">管理员</div>
          </div>
        </div>
      </div>
    </div>
  );
}
