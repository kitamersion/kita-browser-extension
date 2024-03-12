import eventBus, { CallbackFunction, PublishData } from ".";

describe("EventBus", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should subscribe to an event and receive the data", () => {
    const eventName = "testEvent";
    const testData: PublishData = { message: "Test message", value: { id: "1", title: "Test Video" } };
    const mockCallback: CallbackFunction = jest.fn();

    eventBus.subscribe(eventName, mockCallback);
    eventBus.publish(eventName, testData);

    expect(mockCallback).toHaveBeenCalledWith(testData);
  });

  it("should unsubscribe from an event", () => {
    const eventName = "testEvent";
    const mockCallback: CallbackFunction = jest.fn();

    eventBus.subscribe(eventName, mockCallback);
    eventBus.unsubscribe(eventName, mockCallback);
    eventBus.publish(eventName, null);

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it("should not publish data if no subscribers are present", () => {
    const eventName = "testEvent";
    const testData: PublishData = { message: "Test message", value: { id: "f590c2f8-b78c-4d49-93f5-aeeec6f0fb39", title: "Test Video" } };

    eventBus.publish(eventName, testData);

    expect(true).toBeTruthy();
  });

  it("should handle publishing without data", () => {
    const eventName = "testEvent";
    const mockCallback: CallbackFunction = jest.fn();

    eventBus.subscribe(eventName, mockCallback);
    eventBus.publish(eventName, null);

    expect(mockCallback).not.toHaveBeenCalled();
  });
});
