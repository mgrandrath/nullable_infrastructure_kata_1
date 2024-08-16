import { describe, expect, it, vi } from "vitest";
import { createPayment } from "./spec-helpers";
import {
  ICalendar,
  IEmailService,
  IPaymentsApi,
  triggerUnusualSpendingEmail,
} from "./trigger-unusual-spending-email";

describe("triggerUnusualSpendingEmail", () => {
  it("should test", async () => {
    const year = 2024;
    const month = 10;
    const customerId = "customer-123";

    const calendar: ICalendar = {
      getCurrentMonthAndYear: () => ({
        month,
        year,
      }),
      getPreviousMonthAndYear: () => ({
        month: month - 1,
        year,
      }),
    };
    const paymentsApi: IPaymentsApi = {
      fetchUserPaymentsByMonth: vi.fn(),
    };
    const emailService: IEmailService = {
      sendEmailToCustomer: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(paymentsApi.fetchUserPaymentsByMonth).mockImplementation(
      async (_customerId, _year, _month) => {
        if (_customerId !== customerId) {
          throw new Error(
            `Expected customerId "${customerId}" but got "${_customerId}"`
          );
        }
        if (_year !== year) {
          throw new Error(`Expected year "${year}" but got "${_year}"`);
        }

        if (_month === month - 1) {
          return [createPayment({ price: 100, category: "Some category" })];
        } else if (_month === month) {
          return [createPayment({ price: 200, category: "Some category" })];
        } else return [];
      }
    );

    await triggerUnusualSpendingEmail(
      calendar,
      paymentsApi,
      emailService,
      customerId
    );

    expect(emailService.sendEmailToCustomer).toHaveBeenCalledWith(
      customerId,
      "Unusual spending of $200 detected!",
      [
        "Hello card user!",
        "",
        "We have detected unusually high spending on your card in these categories:",
        "",
        "* You spent $200 on Some category",
        "",
        "Love,",
        "",
        "The Credit Card Company",
      ].join("\n")
    );
  });
});
