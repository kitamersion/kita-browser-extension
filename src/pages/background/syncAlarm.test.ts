jest.mock("@/api/sync/syncEngine", () => ({ runSync: jest.fn().mockResolvedValue({ status: "ok" }) }));
jest.mock("@/api/settings/manager", () => ({ settingsManager: { get: jest.fn() } }));

import { runSync } from "@/api/sync/syncEngine";
import { settingsManager } from "@/api/settings/manager";
import { getNextSyncTime, initSyncAlarm, SYNC_ALARM_NAME } from "./syncAlarm";

describe("initSyncAlarm", () => {
  let alarmListener: (alarm: { name: string }) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    (settingsManager.get as jest.Mock).mockResolvedValue(15);
    (global as any).chrome = {
      alarms: {
        create: jest.fn(),
        get: jest.fn(),
        onAlarm: { addListener: jest.fn((cb) => (alarmListener = cb)) },
      },
    };
  });

  test("registers a periodic alarm using the configured interval", async () => {
    (settingsManager.get as jest.Mock).mockResolvedValue(30);
    await initSyncAlarm();
    expect(chrome.alarms.create).toHaveBeenCalledWith(SYNC_ALARM_NAME, { periodInMinutes: 30 });
  });

  test("running the sync alarm calls runSync", async () => {
    await initSyncAlarm();
    alarmListener({ name: SYNC_ALARM_NAME });
    expect(runSync).toHaveBeenCalled();
  });

  test("ignores unrelated alarms", async () => {
    await initSyncAlarm();
    alarmListener({ name: "some-other-alarm" });
    expect(runSync).not.toHaveBeenCalled();
  });

  test("reschedules the alarm using the latest interval after a tick completes", async () => {
    await initSyncAlarm();
    (settingsManager.get as jest.Mock).mockResolvedValue(60);
    (chrome.alarms.create as jest.Mock).mockClear();

    alarmListener({ name: SYNC_ALARM_NAME });
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }

    expect(chrome.alarms.create).toHaveBeenCalledWith(SYNC_ALARM_NAME, { periodInMinutes: 60 });
  });
});

describe("getNextSyncTime", () => {
  beforeEach(() => {
    (global as any).chrome = { alarms: { get: jest.fn() } };
  });

  test("resolves the scheduled time of the sync alarm", async () => {
    (chrome.alarms.get as jest.Mock).mockImplementation((_name, callback) => callback({ scheduledTime: 12345 }));
    await expect(getNextSyncTime()).resolves.toBe(12345);
    expect(chrome.alarms.get).toHaveBeenCalledWith(SYNC_ALARM_NAME, expect.any(Function));
  });

  test("resolves null when no sync alarm is scheduled", async () => {
    (chrome.alarms.get as jest.Mock).mockImplementation((_name, callback) => callback(undefined));
    await expect(getNextSyncTime()).resolves.toBeNull();
  });
});
