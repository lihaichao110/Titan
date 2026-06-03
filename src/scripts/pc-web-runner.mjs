import { readFileSync } from 'fs';
import { chromium } from 'playwright';

function loadLocalEnv() {
  let content = '';
  try {
    content = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
  } catch {
    return;
  }

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function nowTime() {
  return new Date().toTimeString().slice(0, 8);
}

function makeLog(level, msg) {
  return { time: nowTime(), level, msg };
}

function emitEvent(event, payload) {
  console.log(JSON.stringify({ event, payload }));
}

function emitLog(logs, level, msg) {
  const log = makeLog(level, msg);
  logs.push(log);
  emitEvent('log', log);
}

function emitStepResult(results, result) {
  results.push(result);
  emitEvent('step', result);
}

function formatDuration(startedAt) {
  const seconds = (Date.now() - startedAt) / 1000;
  return `00:00:${String(Math.max(0, Math.round(seconds))).padStart(2, '0')}`;
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: false });
  } catch (error) {
    const message = error?.message || String(error);
    throw new Error(
      `无法启动浏览器。\n` +
      `请运行 pnpm exec playwright install chromium 安装 Playwright Chromium。\n` +
      `原始错误: ${message}`
    );
  }
}

function isBaiduHomeAssertStep(step) {
  return step.kind === 'assert' && step.instruction.includes('百度首页') && step.instruction.includes('搜索框');
}

function isBaiduSearchStep(step) {
  return step.kind !== 'assert' && step.instruction.includes('百度搜索框') && step.instruction.includes('今日新闻');
}

function isBaiduSearchResultAssertStep(step) {
  return step.kind === 'assert' && step.instruction.includes('搜索结果') && step.instruction.includes('今日新闻');
}

function isBaiduOpenFirstNewsStep(step) {
  return step.kind !== 'assert' && step.instruction.includes('第一条新闻');
}

async function waitForPageReady(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
}

async function assertNoBaiduCaptcha(page) {
  const captcha = page.locator('text=/安全验证|验证一下|拖动滑块|请完成下方验证/');
  if (await captcha.first().isVisible({ timeout: 1000 }).catch(() => false)) {
    throw new Error('百度触发安全验证，无法继续自动执行搜索');
  }
}

async function findVisibleBaiduSearchInput(page) {
  const candidates = [
    page.locator('#kw'),
    page.locator('input[name="wd"]'),
    page.locator('input[aria-label*="搜索"]'),
    page.locator('input[placeholder*="搜索"]'),
  ];

  for (const candidate of candidates) {
    const count = await candidate.count();
    for (let index = 0; index < count; index += 1) {
      const input = candidate.nth(index);
      if (await input.isVisible().catch(() => false)) {
        return input;
      }
    }
  }

  throw new Error('未找到可见的百度搜索框');
}

async function runBaiduSearch(page) {
  await assertNoBaiduCaptcha(page);
  const searchInput = await findVisibleBaiduSearchInput(page);
  await searchInput.pressSequentially('今日新闻', { delay: 80 });
  await Promise.all([
    page.waitForURL(/baidu\.com\/s|wd=%E4%BB%8A%E6%97%A5%E6%96%B0%E9%97%BB/, { timeout: 15000 }).catch(() => {}),
    searchInput.press('Enter'),
  ]);
  await waitForPageReady(page);
  await assertNoBaiduCaptcha(page);
}

async function assertBaiduHomeReady(page) {
  await waitForPageReady(page);
  await assertNoBaiduCaptcha(page);
  await findVisibleBaiduSearchInput(page);
}

async function assertBaiduSearchResultsReady(page) {
  await waitForPageReady(page);
  await assertNoBaiduCaptcha(page);
  await page.waitForURL(/baidu\.com\/s|wd=%E4%BB%8A%E6%97%A5%E6%96%B0%E9%97%BB/, { timeout: 15000 }).catch(() => {});
  await findVisibleBaiduSearchInput(page);

  const results = page.locator(
    '#content_left .result, #content_left .c-container, #content_left h3 a'
  );
  if ((await results.count()) === 0) {
    throw new Error('未找到“今日新闻”相关搜索结果列表');
  }
}

async function openFirstBaiduNewsResult(page, browser) {
  await assertNoBaiduCaptcha(page);
  const firstResultLink = page.locator(
    '#content_left .result h3 a, #content_left .c-container h3 a, #content_left h3 a'
  ).first();
  await firstResultLink.waitFor({ state: 'visible', timeout: 15000 });

  const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
  await firstResultLink.click();
  const popup = await popupPromise;
  const targetPage = popup || page;
  await waitForPageReady(targetPage);
  await assertNoBaiduCaptcha(targetPage);

  if (popup) {
    const pages = browser.contexts().flatMap((context) => context.pages());
    await Promise.all(pages.filter((openPage) => openPage !== targetPage).map((openPage) => openPage.close().catch(() => {})));
  }

  return targetPage;
}

function unsupportedAiStep(step) {
  throw new Error(`不再支持 AI 步骤，请用 Playwright 实现该步骤: ${step.instruction}`);
}

function normalizeUrl(url) {
  const value = String(url || '').trim();
  if (!value) {
    throw new Error('目标 URL 不能为空');
  }

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    throw new Error('目标 URL 格式无效');
  }
}

function readRequest() {
  const input = readFileSync(0, 'utf8');
  if (!input.trim()) {
    throw new Error('缺少执行请求');
  }
  return JSON.parse(input);
}

async function run() {
  const request = readRequest();
  loadLocalEnv();

  const url = normalizeUrl(request.url);
  const steps = Array.isArray(request.steps) ? request.steps : [];
  if (!steps.length) {
    throw new Error('测试步骤不能为空');
  }

  const logs = [];
  const results = [];
  let screenshot = '';
  let browser = null;

  const captureAndEmitScreenshot = async (page) => {
    const image = await page.screenshot({ type: 'png', fullPage: false });
    screenshot = `data:image/png;base64,${image.toString('base64')}`;
    emitEvent('screenshot', { screenshot });
  };

  try {
    emitLog(logs, 'INFO', `启动可见 Playwright 浏览器: ${url}`);
    browser = await launchBrowser();
    let page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await captureAndEmitScreenshot(page);

    for (const step of steps) {
      const startedAt = Date.now();
      emitEvent('step', {
        step: step.step,
        status: 'executing',
        duration: null,
        detail: '正在执行...',
      });
      emitLog(logs, 'INFO', `执行步骤 ${step.step}: ${step.name}`);
      await captureAndEmitScreenshot(page);

      try {
        if (isBaiduHomeAssertStep(step)) {
          await assertBaiduHomeReady(page);
        } else if (isBaiduSearchStep(step)) {
          await runBaiduSearch(page);
        } else if (isBaiduSearchResultAssertStep(step)) {
          await assertBaiduSearchResultsReady(page);
        } else if (isBaiduOpenFirstNewsStep(step)) {
          page = await openFirstBaiduNewsResult(page, browser);
        } else {
          unsupportedAiStep(step);
        }

        const duration = formatDuration(startedAt);
        emitStepResult(results, {
          step: step.step,
          status: 'passed',
          duration,
          detail: '执行通过',
        });
        emitLog(logs, 'SUCCESS', `步骤 ${step.step} 执行通过 (耗时: ${duration})`);
        await captureAndEmitScreenshot(page);
      } catch (error) {
        const duration = formatDuration(startedAt);
        const message = error?.message || String(error);
        emitStepResult(results, {
          step: step.step,
          status: 'failed',
          duration,
          detail: message,
        });
        emitLog(logs, 'ERROR', `步骤 ${step.step} 执行失败: ${message}`);
        await captureAndEmitScreenshot(page);
        break;
      }
    }

    const success = results.length === steps.length && results.every((r) => r.status === 'passed');
    emitLog(logs, success ? 'SUCCESS' : 'ERROR', success ? 'PC Web 测试执行完成' : 'PC Web 测试执行失败');

    const result = {
      success,
      steps: results,
      logs,
      screenshot,
      error: success ? null : results.find((r) => r.status === 'failed')?.detail || '测试执行失败',
    };
    emitEvent('result', result);
    return result;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

try {
  await run();
} catch (error) {
  console.error(error?.message || String(error));
  process.exit(1);
}
