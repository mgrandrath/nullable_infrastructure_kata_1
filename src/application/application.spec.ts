import { describe, expect, it } from "vitest";
import { MonthInYear } from "../domain/domain";
import { captureEvents, createPayment } from "../spec-helpers";
import { Calendar } from "../infrastructure/calendar";
import { PaymentApi } from "../infrastructure/payment-api";
import { EmailService } from "../infrastructure/email-service";
import { Application } from "./application";

describe("Application", () => {
  // The method `triggerUnusualSpendingEmail` is the place where domain logic
  // and infrastructure are connected. the use of Nullable infrastructure really
  // shines for tests for this kind of code. Look at how concise and simple
  // these tests are! And remember that they not only test the interactions with
  // the infrastructure classes but the entire stack down to side effects like
  // sending HTTP requests and sending emails. They test the outcome, not the
  // interactions.
  //
  // Think about how using mocks would look like in comparison. The test setup
  // would be significantly harder to follow. The tests would also give you less
  // confidence because they would not detect bugs from the interplay between
  // the `triggerUnusualSpendingEmail` method and the infrastructure classes.
  // After all, mocks only verify that methods have been called in a certain way
  // and not that these methods had the effect you expected. You would need to
  // write additional integration tests to account for this. At the same time
  // tests using mocks would be more brittle because they break and need
  // adjustments when a refactoring changes the interaction with an
  // infrastructure class.
  describe("triggerUnusualSpendingEmail", () => {
    it("should send an email when unusual spending is detected", async () => {
      const customerId = "customer-123";
      const currentMonth: MonthInYear = { month: 11, year: 2024 };
      const previousMonth: MonthInYear = { month: 10, year: 2024 };
      const previousMonthPayments = [
        createPayment({ price: 99.99, category: "electronics" }),
        createPayment({ price: 149.99, category: "electronics" }),
        createPayment({ price: 29.99, category: "home" }),
        createPayment({ price: 150.99, category: "clothing" }),
      ];
      const currentMonthPayments = [
        createPayment({ price: 70.89, category: "electronics" }),
        createPayment({ price: 375.0, category: "electronics" }),
        createPayment({ price: 39.99, category: "home" }),
        createPayment({ price: 200.49, category: "beauty" }),
      ];

      const calendar = Calendar.createNull(currentMonth);
      const paymentsApi = PaymentApi.createNull([
        {
          customerId,
          monthInYear: previousMonth,
          payments: previousMonthPayments,
        },
        {
          customerId,
          monthInYear: currentMonth,
          payments: currentMonthPayments,
        },
      ]);
      const emailService = EmailService.createNull();
      const sentEmails = captureEvents(emailService.events);
      const application = new Application(calendar, paymentsApi, emailService);

      await application.triggerUnusualSpendingEmail(customerId);

      expect(sentEmails.data()).toEqual([
        {
          type: "emailSentToCustomer",
          payload: {
            customerId,
            subject: "Unusual spending of $646.38 detected!",
            body: [
              "Hello card user!",
              "",
              "We have detected unusually high spending on your card in these categories in 2024-11:",
              "",
              "* You spent $445.89 on electronics",
              "* You spent $200.49 on beauty",
              "",
              "Love,",
              "",
              "The Credit Card Company",
            ].join("\n"),
          },
        },
      ]);
    });

    it("should not send an email when no unusual spending is detected", async () => {
      const customerId = "customer-123";
      const currentMonthx: MonthInYear = { month: 11, year: 2024 };
      const previousMonthx: MonthInYear = { month: 10, year: 2024 };
      const previousMonthPayments = [
        createPayment({ price: 99.99, category: "electronics" }),
        createPayment({ price: 149.99, category: "electronics" }),
        createPayment({ price: 29.99, category: "home" }),
        createPayment({ price: 150.99, category: "clothing" }),
      ];
      const currentMonthPayments = [
        createPayment({ price: 70.89, category: "electronics" }),
        createPayment({ price: 39.99, category: "home" }),
        createPayment({ price: 200.49, category: "clothing" }),
      ];

      const calendar = Calendar.createNull(currentMonthx);
      const paymentsApi = PaymentApi.createNull([
        {
          customerId,
          monthInYear: previousMonthx,
          payments: previousMonthPayments,
        },
        {
          customerId,
          monthInYear: currentMonthx,
          payments: currentMonthPayments,
        },
      ]);
      const emailService = EmailService.createNull();
      const sentEmails = captureEvents(emailService.events);
      const application = new Application(calendar, paymentsApi, emailService);

      await application.triggerUnusualSpendingEmail(customerId);

      expect(sentEmails.data()).toEqual([]);
    });
  });
});
