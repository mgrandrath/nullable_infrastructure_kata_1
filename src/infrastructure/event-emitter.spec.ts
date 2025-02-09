import { describe, expect, it, vi } from "vitest";
import { EventEmitter } from "./event-emitter";

describe("EventEmitter", () => {
  it("should emit and listen to events", () => {
    const listenerOne = vi.fn();
    const listenerTwo = vi.fn();
    const eventEmitter = new EventEmitter();
    eventEmitter.addListener(listenerOne);
    eventEmitter.addListener(listenerTwo);

    eventEmitter.emit({
      type: "my-event",
      payload: { data: "hello" },
    });

    expect(listenerOne).toHaveBeenCalledWith({
      type: "my-event",
      payload: { data: "hello" },
    });
    expect(listenerTwo).toHaveBeenCalledWith({
      type: "my-event",
      payload: { data: "hello" },
    });
  });

  it("should not add a listener twice", () => {
    const listener = vi.fn();
    const eventEmitter = new EventEmitter();
    eventEmitter.addListener(listener);
    eventEmitter.addListener(listener);

    eventEmitter.emit({
      type: "my-event",
      payload: { data: "hello" },
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should remove listener", () => {
    const listener = vi.fn();
    const eventEmitter = new EventEmitter();
    eventEmitter.addListener(listener);

    eventEmitter.removeListener(listener);

    eventEmitter.emit({
      type: "my-event",
      payload: { data: "hello" },
    });

    expect(listener).not.toHaveBeenCalled();
  });
});
