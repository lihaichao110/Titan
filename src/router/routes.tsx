import { MainLayout } from "@/layouts/MainLayout";
import { TasksPage } from "@/pages/tasks/TasksPage";
import { TestControlPage } from "@/pages/test-control/TestControlPage";

export const routes = [
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <TasksPage /> },
      { path: "test-control", element: <TestControlPage /> },
    ],
  },
];