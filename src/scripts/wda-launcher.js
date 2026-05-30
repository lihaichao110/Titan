import { WdaClient } from 'appium-webdriveragent';

const PORT = 8100;
const HOST = 'localhost';

let driver = null;

export async function initSession(udid) {
  const caps = {
    platformName: 'iOS',
    deviceName: 'iPhone',
    udid: udid,
    automationName: 'XCUITest',
    noReset: true,
  };

  driver = await WdaClient.start({
    port: PORT,
    host: HOST,
    capabilities: caps,
  });

  return driver.sessionId();
}

export async function swipe(x1, y1, x2, y2, duration = 0.5) {
  if (!driver) {
    throw new Error('WDA session not initialized');
  }

  const actions = [
    { type: 'pointerMove', x: Math.round(x1 * 390), y: Math.round(y1 * 844) },
    { type: 'pointerDown' },
    { type: 'pause', duration: Math.round(duration * 1000) },
    { type: 'pointerMove', x: Math.round(x2 * 390), y: Math.round(y2 * 844) },
    { type: 'pointerUp' },
  ];

  await driver.performActions([{
    type: 'pointer',
    id: 'finger1',
    actions: actions,
  }]);
}

export async function tap(x, y) {
  if (!driver) {
    throw new Error('WDA session not initialized');
  }

  await driver.performActions([{
    type: 'pointer',
    id: 'finger1',
    actions: [
      { type: 'pointerMove', x: Math.round(x * 390), y: Math.round(y * 844) },
      { type: 'pointerDown' },
      { type: 'pointerUp' },
    ],
  }]);
}

export async function closeSession() {
  if (driver) {
    await driver.deleteSession();
    driver = null;
  }
}