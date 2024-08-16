import { Payment } from "./types";

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
