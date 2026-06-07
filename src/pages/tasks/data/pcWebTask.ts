import type { Task } from "@/types/tasks";
import type { PcWebLocator, PcWebStep } from "@/types/test-control";

const usernameLocators: PcWebLocator[] = [
  { type: "css", value: "input.ant-input[type='text']" },
  { type: "placeholder", value: "用户名" },
  { type: "placeholder", value: "邮箱" },
];

const passwordLocators: PcWebLocator[] = [
  { type: "css", value: "input.ant-input[type='password']" },
  { type: "css", value: "input[type='password']" },
  { type: "placeholder", value: "密码" },
];

// 前端步骤数据直接描述动作和定位器，供任务列表和 PC Web 执行器复用。
export const defaultSteps: PcWebStep[] = [
  {
    step: 1,
    name: "加载登录页",
    kind: "assert",
    action: "assertVisible",
    locators: usernameLocators,
    instruction:
      "校验 CodeVortex 登录页已经加载完成，页面上能看到用户名输入框",
  },
  {
    step: 2,
    name: "输入账号",
    kind: "act",
    action: "fill",
    locators: usernameLocators,
    value: "test_user",
    instruction: "在登录页输入测试账号 test_user",
  },
  {
    step: 3,
    name: "输入密码",
    kind: "act",
    action: "fill",
    locators: passwordLocators,
    value: "test_password",
    instruction: "在登录页输入测试密码",
  },
  {
    step: 4,
    name: "点击登录",
    kind: "act",
    action: "click",
    locators: [
      { type: "css", value: ".submit-btn" },
      { type: "css", value: "button.submit-btn" },
      { type: "css", value: "button[type='submit']" },
      { type: "text", value: "登录" },
    ],
    instruction: "点击登录按钮提交表单",
  },
  {
    step: 5,
    name: "验证进入后台首页",
    kind: "assert",
    action: "assertText",
    value: "创作平台",
    timeoutMs: 20000,
    instruction: "登录后已经进入 CodeVortex 后台首页",
  },
];

export const pcWebTask: Task = {
  id: "1",
  name: "API 集成测试",
  description: "验证所有核心 API 接口的连通性和返回数据准确性",
  type: "接口测试",
  status: "running",
  environment: "pc",
  creator: "张三",
  updatedAt: "10分钟前",
  url: "https://intra.lihaichao.cn/login",
  data: defaultSteps,
};
