import EventEmitter from "events";
import { Payment } from "./domain";

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

// Copy types from @types/node/events.d.ts that are unfortunately not exported
type DefaultEventMap = [never];
type EventMap<T> = Record<keyof T, any[]> | DefaultEventMap;
type Key<K, T> = T extends DefaultEventMap ? string | symbol : K | keyof T;
type AnyRest = [...args: any[]];
type Args<K, T> = T extends DefaultEventMap
  ? AnyRest
  : K extends keyof T
  ? T[K]
  : never;
type Listener<K, T, F> = T extends DefaultEventMap
  ? F
  : K extends keyof T
  ? T[K] extends unknown[]
    ? (...args: T[K]) => void
    : never
  : never;

export type EventTracker<T> = {
  data: () => ReadonlyArray<T>;
};

export const captureEvents = <T extends EventMap<T>, K extends keyof T>(
  eventEmitter: EventEmitter<T>,
  eventName: Key<K, T>
): EventTracker<Args<K, T>[0]> => {
  const events: Args<K, T>[0][] = [];

  eventEmitter.on(eventName, ((...args: Args<K, T>) => {
    events.push(args[0]);
  }) as Listener<K, T, (...args: any[]) => void>);

  return {
    data: () => {
      const result = [...events];
      events.length = 0;
      return result;
    },
  };
};
