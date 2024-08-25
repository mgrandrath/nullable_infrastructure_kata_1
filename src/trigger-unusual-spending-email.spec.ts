import { describe, expect, it } from "vitest";
import { captureEvents, createPayment } from "./spec-helpers";
import { Calendar } from "./infrastructure/calendar";
import { PaymentApi } from "./infrastructure/payment-api";
import { EmailService } from "./infrastructure/email-service";
import { triggerUnusualSpendingEmail } from "./trigger-unusual-spending-email";

describe("triggerUnusualSpendingEmail", () => {
  it("should send an email when unusual spending is detected", async () => {
    const year = 2024;
    const month = 10;
    const customerId = "customer-123";
    const previousMonthPayments = [
      createPayment({ price: 100, category: "Some category" }),
    ];
    const currentMonthPayments = [
      createPayment({ price: 200, category: "Some category" }),
    ];

    const calendar = Calendar.createNull({ month, year });
    const paymentsApi = PaymentApi.createNull({
      [`${customerId}/${year}-${month - 1}`]: previousMonthPayments,
      [`${customerId}/${year}-${month}`]: currentMonthPayments,
    });
    const emailService = EmailService.createNull();
    const sentEmails = captureEvents(
      emailService.events,
      "emailSentToCustomer"
    );

    await triggerUnusualSpendingEmail(
      calendar,
      paymentsApi,
      emailService,
      customerId
    );

    expect(sentEmails.data()).toEqual([
      {
        customerId,
        subject: "Unusual spending of $200 detected!",
        body: [
          "Hello card user!",
          "",
          "We have detected unusually high spending on your card in these categories:",
          "",
          "* You spent $200 on Some category",
          "",
          "Love,",
          "",
          "The Credit Card Company",
        ].join("\n"),
      },
    ]);
  });
});
