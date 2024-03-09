import { IVideo } from "@/types/video";

export type CallbackFunction = (data: any) => void;
export type PublishData = {
  message: string;
  value: IVideo | any;
};

class EventBus {
  private events: { [eventName: string]: CallbackFunction[] };

  constructor() {
    this.events = {};
  }

  subscribe(eventName: string, callback: CallbackFunction): void {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  }

  unsubscribe(eventName: string, callback: CallbackFunction): void {
    const event = this.events[eventName];
    if (event) {
      this.events[eventName] = event.filter((cb) => cb !== callback);
    }
  }

  publish(eventName: string, data: PublishData | null): void {
    const event = this.events[eventName];
    if (event) {
      event.forEach((callback) => {
        if (!data) return;
        callback(data);
      });
    }
  }
}

export default new EventBus();
