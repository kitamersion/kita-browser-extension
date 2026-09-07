jest.mock("@/api/sync/syncEngine", () => ({ runSync: jest.fn().mockResolvedValue({ status: "ok" }) }));

import { runSync } from "@/api/sync/syncEngine";
import { initSyncAlarm, SYNC_ALARM_NAME } from "./syncAlarm";

describe("initSyncAlarm", () => {
  let alarmListener: (alarm: { name: string }) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).chrome = {
      alarms: {
        create: jest.fn(),
        onAlarm: { addListener: jest.fn((cb) => (alarmListener = cb)) },
      },
    };
  });

  test("registers a periodic alarm with the expected name", () => {
    initSyncAlarm();
    expect(chrome.alarms.create).toHaveBeenCalledWith(SYNC_ALARM_NAME, expect.objectContaining({ periodInMinutes: expect.any(Number) }));
  });

  test("running the sync alarm calls runSync", () => {
    initSyncAlarm();
    alarmListener({ name: SYNC_ALARM_NAME });
    expect(runSync).toHaveBeenCalled();
  });

  test("ignores unrelated alarms", () => {
    initSyncAlarm();
    alarmListener({ name: "some-other-alarm" });
    expect(runSync).not.toHaveBeenCalled();
  });
});
