import { Payment } from "./domain/domain";
import { EventEmitter, Event } from "./infrastructure/event-emitter";

const factory =
  <T extends object>(defaults: T) =>
  (overrides: Partial<T> = {}): T => ({
    ...defaults,
    ...overrides,
  });

export const createPayment = factory<Payment>({
  price: 1,
  category: "factory-payment",
  description: "An example payment",
});

export type EventTracker = {
  data: () => ReadonlyArray<Event>;
};

export const captureEvents = (eventEmitter: EventEmitter): EventTracker => {
  const capturedEvents: Event[] = [];

  eventEmitter.addListener((event) => {
    capturedEvents.push(event);
  });

  return {
    data: () => {
      const result = [...capturedEvents];

      // Setting the `length` property of an aray to `0` effectively empties the
      // array.
      capturedEvents.length = 0;

      return result;
    },
  };
};
