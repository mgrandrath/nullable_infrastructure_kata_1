import NodeJsEventEmitter from "node:events";

export type Event<
  TType extends string = string,
  TPayload extends object = any,
> = {
  type: TType;
  payload: TPayload;
};
export type EventListener = (event: Event) => void;

const INTERNAL_EVENT_NAME = "event";

export class EventEmitter {
  private emitter = new NodeJsEventEmitter();

  addListener(listener: EventListener) {
    if (this.emitter.listeners(INTERNAL_EVENT_NAME).includes(listener)) {
      return;
    }

    this.emitter.on(INTERNAL_EVENT_NAME, listener);
  }

  removeListener(listener: EventListener) {
    this.emitter.off(INTERNAL_EVENT_NAME, listener);
  }

  emit(event: Event) {
    this.emitter.emit(INTERNAL_EVENT_NAME, event);
  }
}
