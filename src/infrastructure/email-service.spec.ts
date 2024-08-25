import { describe, expect, it } from "vitest";
import { EmailClient } from "./email-client";
import { EmailService } from "./email-service";
import { captureEvents } from "../spec-helpers";

describe("EmailService", () => {
  it("should send an email to a given customer", async () => {
    const emailClient = EmailClient.createNull();
    const emailService = new EmailService(
      {
        smtpServer: {
          host: "smtp.my-bank.com",
          port: 1234,
        },
        senderAddress: "unusual-spending@service.my-bank.com",
      },
      emailClient
    );
    const events = captureEvents(emailClient.events, "emailSent");

    await emailService.sendEmailToCustomer(
      "customer-123",
      "Important message",
      "The message content"
    );

    expect(events.data()).toEqual([
      {
        smtpServer: {
          host: "smtp.my-bank.com",
          port: 1234,
        },
        email: {
          from: "unusual-spending@service.my-bank.com",
          to: "customer-123@customer.my-bank.com",
          subject: "Important message",
          text: "The message content",
        },
      },
    ]);
  });

  it("should emit an event whenever an email has been sent to a customer", async () => {
    const emailClient = EmailClient.createNull();
    const emailService = new EmailService(
      {
        smtpServer: {
          host: "smtp.my-bank.com",
          port: 1234,
        },
        senderAddress: "unusual-spending@service.my-bank.com",
      },
      emailClient
    );
    const events = captureEvents(emailService.events, "emailSentToCustomer");

    await emailService.sendEmailToCustomer(
      "customer-123",
      "Important message",
      "The message content"
    );

    expect(events.data()).toEqual([
      {
        customerId: "customer-123",
        subject: "Important message",
        body: "The message content",
      },
    ]);
  });

  it("should not emit an event sending the email failed", async () => {
    const expectedError = new Error("Send failed");
    const emailClient = EmailClient.createNull({
      errorOnSend: expectedError,
    });
    const emailService = new EmailService(
      {
        smtpServer: {
          host: "irrelevant.my-bank.com",
          port: 1234,
        },
        senderAddress: "irrelevant@service.my-bank.com",
      },
      emailClient
    );
    const events = captureEvents(emailService.events, "emailSentToCustomer");

    await emailService
      .sendEmailToCustomer(
        "customer-123",
        "Important message",
        "The message content"
      )
      .catch((error) => {
        if (error !== expectedError) {
          throw error;
        }
      });

    expect(events.data()).toEqual([]);
  });
});
