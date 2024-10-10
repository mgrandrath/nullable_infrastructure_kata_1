import { describe, expect, it } from "vitest";
import { triggerUnusualSpendingEmail } from "./trigger-unusual-spending-email";
import { EmailService } from "../infrastructure/email-service";
import { captureEvents, createPayment } from "../spec-helpers";
import { Calendar } from "../infrastructure/calendar";
import { PaymentApi } from "../infrastructure/payment-api";

describe("triggerUnusualSpendingEmail", () => {
  it("should send an email when unusual spending is detected", async () => {
    // TODO
  });
});

const customerId = "cust-123";
const expectedSubject = "Unusual spending of $646.38 detected!";
const expectedBody = [
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
].join("\n");
