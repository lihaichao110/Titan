import { existsSync, openSync, readFileSync, writeFileSync } from 'fs';
import { execFileSync, spawn } from 'child_process';

const PORT = 8100;
const MJPEG_PORT = 9100;
const APPIUM_HOST = 'http://127.0.0.1:4723';
const SESSION_FILE = '/tmp/wda-session.json';
const APPIUM_LOG_FILE = '/tmp/titan-appium.log';

const DEVICE_NAME = 'iPhone 16 Pro';
const XCODE_ORG_ID = '5429KCASWR';
const XCODE_SIGNING_ID = 'Apple Development';
const WDA_BUNDLE_ID = 'com.lihaichao.titan.WebDriverAgentRunner';
const BUNDLE_ID = 'com.apple.springboard';

function loadSession() {
  try {
    const data = readFileSync(SESSION_FILE, 'utf8');
    const json = JSON.parse(data);
    sessionId = json.sessionId;
    baseUrl = json.baseUrl;
    sessionUdid = json.udid;
  } catch {}
}

function saveSession() {
  writeFileSync(SESSION_FILE, JSON.stringify({ sessionId, baseUrl, udid: sessionUdid }));
}

let sessionId = null;
let baseUrl = null;
let sessionUdid = null;
loadSession();

function findNodeBinary() {
  const home = process.env.HOME || '';
  const candidates = [
    `${home}/.nvm/versions/node/v24.15.0/bin/node`,
    process.execPath,
    'node',
  ];
  return candidates.find((candidate) => candidate === 'node' || existsSync(candidate));
}

function findAppiumEntry() {
  const home = process.env.HOME || '';
  const candidates = [
    `${home}/.nvm/versions/node/v24.15.0/lib/node_modules/appium/index.js`,
    '/usr/local/lib/node_modules/appium/index.js',
    '/opt/homebrew/lib/node_modules/appium/index.js',
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readAppiumLogTail() {
  try {
    const lines = readFileSync(APPIUM_LOG_FILE, 'utf8')
      .replace(/\u001b\[[0-9;]*m/g, '')
      .split('\n');
    const keyLines = lines.filter((line) =>
      line.includes('[Xcode]') && (
        line.includes('error:') ||
        line.includes('Testing failed:') ||
        line.includes('No signing certificate') ||
        line.includes('No Account for Team') ||
        line.includes('No profiles for')
      )
    );
    return (keyLines.length ? keyLines.slice(-12) : lines.slice(-30)).join('\n').trim();
  } catch {
    return '';
  }
}

function runLocalCommand(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 15000,
    }).trim();
  } catch {
    return '';
  }
}

function parseMajorVersion(version) {
  const major = Number(String(version || '').split('.')[0]);
  return Number.isFinite(major) ? major : null;
}

function findXcodeDevice(udid) {
  const output = runLocalCommand('xcrun', ['xctrace', 'list', 'devices']);
  let offline = false;

  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '== Devices Offline ==') {
      offline = true;
      continue;
    }
    if (trimmed.startsWith('== ')) {
      offline = false;
      continue;
    }
    if (!trimmed.includes(`(${udid})`)) {
      continue;
    }

    const groups = [...trimmed.matchAll(/\(([^()]*)\)/g)].map((match) => match[1]);
    const udidIndex = groups.indexOf(udid);
    const version = udidIndex > 0 ? groups[udidIndex - 1] : null;
    return {
      line: trimmed,
      offline,
      version: version && /^\d/.test(version) ? version : null,
    };
  }

  return null;
}

function assertXcodeCanUseDevice(udid) {
  const sdkVersion = runLocalCommand('xcrun', ['--sdk', 'iphoneos', '--show-sdk-version']);
  const xcodeVersion = runLocalCommand('xcodebuild', ['-version']).split('\n').join(', ');
  const device = findXcodeDevice(udid);
  const sdkMajor = parseMajorVersion(sdkVersion);
  const deviceMajor = parseMajorVersion(device?.version);

  if (sdkMajor !== null && deviceMajor !== null && deviceMajor > sdkMajor) {
    throw new Error(
      `当前 Xcode 不支持该 iOS 真机，无法启动 WebDriverAgent。\n` +
      `设备: ${device.line}\n` +
      `当前 Xcode: ${xcodeVersion || 'unknown'}\n` +
      `当前 iPhoneOS SDK: ${sdkVersion || 'unknown'}\n` +
      `处理方式: 使用 iOS ${sdkMajor}.x 或更低版本设备/模拟器，或换到可安装更高版本 Xcode 的 Mac 上运行。`
    );
  }

  if (device?.offline) {
    throw new Error(
      `Xcode 当前将该设备标记为离线，无法启动 WebDriverAgent。\n` +
      `设备: ${device.line}\n` +
      `当前 Xcode: ${xcodeVersion || 'unknown'}\n` +
      `处理方式: 解锁 iPhone、确认信任此电脑和开发者模式；如果设备 iOS 版本高于当前 Xcode SDK，则需要更高版本 Xcode。`
    );
  }
}

async function fetchJson(url, options = {}) {
  const { timeoutMs, ...fetchOptions } = options;
  let response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal: fetchOptions.signal ?? (timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined),
    });
  } catch (error) {
    const cause = error?.cause?.message ? ` (${error.cause.message})` : '';
    throw new Error(`Appium 请求失败: ${url}${cause}`);
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { value: { message: text } };
    }
  }

  if (!response.ok) {
    const message = data?.value?.message || data?.message || `Appium request failed: ${response.status}`;
    const logTail = url.endsWith('/session') ? readAppiumLogTail() : '';
    throw new Error(logTail ? `${message}\nAppium 日志尾部:\n${logTail}` : message);
  }

  return data;
}

async function ensureAppiumServer() {
  let lastError = null;
  try {
    await fetchJson(`${APPIUM_HOST}/status`, { timeoutMs: 3000 });
    return;
  } catch (error) {
    lastError = error;
    await startLocalAppiumServer();
  }

  for (let i = 0; i < 30; i += 1) {
    try {
      await fetchJson(`${APPIUM_HOST}/status`, { timeoutMs: 3000 });
      return;
    } catch (error) {
      lastError = error;
      await sleep(1000);
    }
  }

  const logTail = readAppiumLogTail();
  throw new Error(
    `已尝试自动启动 Appium，但 ${APPIUM_HOST} 仍不可用。${lastError?.message || ''}` +
    (logTail ? `\nAppium 日志尾部:\n${logTail}` : `\nAppium 日志: ${APPIUM_LOG_FILE}`)
  );
}

async function startLocalAppiumServer() {
  const nodeBinary = findNodeBinary();
  const appiumEntry = findAppiumEntry();

  if (!nodeBinary || !appiumEntry) {
    throw new Error('未找到本机 Appium。请确认 Appium 安装在 Node 24 的全局 node_modules 中。');
  }

  const out = openSync(APPIUM_LOG_FILE, 'a');
  const appiumProcess = spawn(nodeBinary, [
    appiumEntry,
    '--address',
    '127.0.0.1',
    '--port',
    '4723',
  ], {
    detached: true,
    stdio: ['ignore', out, out],
    env: {
      ...process.env,
      PATH: `${nodeBinary.replace(/\/node$/, '')}:${process.env.PATH || ''}`,
    },
  });

  appiumProcess.unref();
}

async function initSession(udid, options = {}) {
  assertXcodeCanUseDevice(udid);
  await ensureAppiumServer();

  const data = await fetchJson(`${APPIUM_HOST}/session`, {
    method: 'POST',
    timeoutMs: 240000,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      capabilities: {
        firstMatch: [{}],
        alwaysMatch: {
          platformName: 'iOS',
          'appium:deviceName': DEVICE_NAME,
          'appium:udid': udid,
          'appium:automationName': 'XCUITest',
          'appium:noReset': true,
          'appium:wdaLocalPort': PORT,
          'appium:mjpegServerPort': MJPEG_PORT,
          'appium:xcodeOrgId': XCODE_ORG_ID,
          'appium:xcodeSigningId': XCODE_SIGNING_ID,
          'appium:updatedWDABundleId': WDA_BUNDLE_ID,
          'appium:allowProvisioningDeviceRegistration': true,
          'appium:bundleId': BUNDLE_ID,
          'appium:showXcodeLog': true,
        },
      },
    }),
  });

  const sid = data.sessionId || (data.value && data.value.sessionId);
  if (sid) {
    sessionId = sid;
    baseUrl = `${APPIUM_HOST}/session/${sessionId}`;
    sessionUdid = udid;
    saveSession();
    if (!options.silent) {
      console.log(baseUrl);
    }
    return baseUrl;
  } else {
    throw new Error(data.value?.message || 'Failed to create session');
  }
}

loadSession();

async function configureMjpegStream() {
  loadSession();
  if (!sessionId) {
    throw new Error('WDA session not initialized');
  }

  await fetchJson(`${baseUrl}/appium/settings`, {
    method: 'POST',
    timeoutMs: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      settings: {
        mjpegServerFramerate: 15,
        mjpegServerScreenshotQuality: 60,
        mjpegScalingFactor: 60,
      },
    }),
  });
}

async function startStream(udid) {
  await closeSession();
  await initSession(udid, { silent: true });
  await configureMjpegStream();

  return {
    sessionUrl: baseUrl,
    streamUrl: `http://127.0.0.1:${MJPEG_PORT}`,
    udid,
    mjpegPort: MJPEG_PORT,
  };
}

async function swipe(x1, y1, x2, y2, duration = 0.5) {
  loadSession();
  if (!sessionId) {
    throw new Error('WDA session not initialized');
  }

  // Use W3C actions API
  await fetch(`${baseUrl}/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      actions: [{
        type: 'pointer',
        id: 'finger1',
        actions: [
          { type: 'pointerMove', x: Math.round(x1 * 390), y: Math.round(y1 * 844) },
          { type: 'pointerDown' },
          { type: 'pause', duration: Math.round(duration * 1000) },
          { type: 'pointerMove', x: Math.round(x2 * 390), y: Math.round(y2 * 844) },
          { type: 'pointerUp' },
        ],
      }],
    }),
  });
}

async function tap(x, y) {
  if (!sessionId) {
    throw new Error('WDA session not initialized');
  }

  await fetch(`${baseUrl}/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      actions: [{
        type: 'pointer',
        id: 'finger1',
        actions: [
          { type: 'pointerMove', x: Math.round(x * 390), y: Math.round(y * 844) },
          { type: 'pointerDown' },
          { type: 'pointerUp' },
        ],
      }],
    }),
  });
}

async function closeSession() {
  if (sessionId) {
    try {
      await fetch(`${baseUrl}`, { method: 'DELETE' });
    } catch {
      // Appium may have been restarted since this session was saved.
    } finally {
      sessionId = null;
      baseUrl = null;
      sessionUdid = null;
      saveSession();
    }
  }
}

// CLI interface
const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case 'init': {
    const udid = args[0];
    try {
      await initSession(udid);
    } catch (e) {
      console.error('Init failed:', e.message);
      process.exit(1);
    }
    break;
  }
  case 'stream': {
    const udid = args[0];
    try {
      const streamInfo = await startStream(udid);
      console.log(JSON.stringify(streamInfo));
    } catch (e) {
      console.error('Stream failed:', e.message);
      process.exit(1);
    }
    break;
  }
  case 'swipe': {
    const [x1, y1, x2, y2, duration] = args.map(Number);
    await swipe(x1, y1, x2, y2, duration);
    console.log('OK');
    break;
  }
  case 'tap': {
    const [x, y] = args.map(Number);
    await tap(x, y);
    console.log('OK');
    break;
  }
  case 'close': {
    await closeSession();
    console.log('OK');
    break;
  }
  default:
    console.error('Unknown command:', cmd);
    process.exit(1);
}

export default {};
