import { createWatchProgressWatcher } from "./watchProgressWatcher";

const createVideoStub = (currentTime: number, duration: number): HTMLVideoElement => {
  const video = document.createElement("video");
  Object.defineProperty(video, "currentTime", { value: currentTime, writable: true, configurable: true });
  Object.defineProperty(video, "duration", { value: duration, writable: true, configurable: true });
  return video;
};

describe("createWatchProgressWatcher", () => {
  test("does not fire before the watch percentage is reached", () => {
    const video = createVideoStub(10, 100);
    const onThresholdReached = jest.fn();
    createWatchProgressWatcher(video, 80, onThresholdReached);

    video.dispatchEvent(new Event("timeupdate"));

    expect(onThresholdReached).not.toHaveBeenCalled();
  });

  test("fires once the watch percentage is reached", () => {
    const video = createVideoStub(80, 100);
    const onThresholdReached = jest.fn();
    createWatchProgressWatcher(video, 80, onThresholdReached);

    video.dispatchEvent(new Event("timeupdate"));

    expect(onThresholdReached).toHaveBeenCalledTimes(1);
  });

  test("fires only once even after further timeupdate events past the threshold", () => {
    const video = createVideoStub(80, 100);
    const onThresholdReached = jest.fn();
    createWatchProgressWatcher(video, 80, onThresholdReached);

    video.dispatchEvent(new Event("timeupdate"));
    Object.defineProperty(video, "currentTime", { value: 95, configurable: true });
    video.dispatchEvent(new Event("timeupdate"));

    expect(onThresholdReached).toHaveBeenCalledTimes(1);
  });

  test("stops listening after destroy is called", () => {
    const video = createVideoStub(10, 100);
    const onThresholdReached = jest.fn();
    const watcher = createWatchProgressWatcher(video, 80, onThresholdReached);
    watcher.destroy();

    Object.defineProperty(video, "currentTime", { value: 90, configurable: true });
    video.dispatchEvent(new Event("timeupdate"));

    expect(onThresholdReached).not.toHaveBeenCalled();
  });
});
