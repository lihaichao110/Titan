import type { Task } from "@/types/tasks";
import { pcWebTask, qqMusicPcTask } from "./pcWebTask";

// 任务页统一数据出口，后续新增任务时只需要追加到这个数组。
export const tasksData: Task[] = [pcWebTask, qqMusicPcTask];
