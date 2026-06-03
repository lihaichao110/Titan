import { useState } from "react";
import { PageHeader } from "./components/PageHeader";
import { ActionToolbar } from "./components/ActionToolbar";
import { StatsCards } from "./components/StatsCards";
import { TaskList } from "./components/TaskList";
import { Pagination } from "./components/Pagination";
import { tasksData } from "./data";
import { statsCardsData } from "./data/mockData";

export function TasksPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 13;

  return (
    <div className="h-full overflow-y-auto overscroll-contain p-6 bg-[#F5F7FB]">
      <PageHeader />
      <ActionToolbar />
      <StatsCards data={statsCardsData} />
      <TaskList
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tasks={tasksData}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
