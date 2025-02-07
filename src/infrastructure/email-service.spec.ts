import { describe, expect, it } from "vitest";
import { SmtpClient } from "./smtp-client";
import { EmailService } from "./email-service";
import { captureEvents, captureEventsNew } from "../spec-helpers";

describe("EmailService", () => {
  it("should send an email to a given customer", async () => {
    // We test the functionality of the real and the Null `SmtpClient` in its
    // own tests. Now we can make use of its ability to work without triggering
    // side effects.
    //
    // Using a Nullable instead of a mock object for these kinds of tests
    // results in more stable tests when it comes to refactoring. We can change
    // the protocol between `EmailService` and `SmtpClient` at will and this
    // test will continue to work as long as we don't change the overall
    // behavior. This includes changes that are not captured by the interface
    // definition. For example, we could change `EmailService` and `SmtpClient`
    // so that the sender email address is wrapped in angle brackets (`<`, `>`).
    // The interface would not change (the address is still a string) but this
    // test would continue to ensure that both classes work together correctly.
    const smtpClient = SmtpClient.createNull();

    // Only in tests are we allowed to use the constructor directly. All other
    // places are required to use either the `create` or `createNull` factory
    // methods.
    const emailService = new EmailService(
      {
        smtpServer: {
          host: "smtp.my-bank.com",
          port: 1234,
        },
        senderAddress: "unusual-spending@service.my-bank.com",
      },
      smtpClient,
    );

    // Start capturing `"emailSent"` events from the `smtpClient`'s event
    // emitter. We use them to detect which emails were sent out by the
    // `smtpClient` during the test.
    const events = captureEvents(smtpClient.events, "emailSent");

    await emailService.sendEmailToCustomer(
      "customer-123",
      "Important message",
      "The message content",
    );

    // Calling `data` on the `EventTracker` returns an array that contains a
    // list of all captured event objects. The event format itself is defined in
    // the `smtp-client` module alongside the `SmtpClient` class.
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
    // The `EmailService` emits its own higher level `"emailSentToCustomer"`
    // events that omit lower level details like the SMTP server configuration.
    const smtpClient = SmtpClient.createNull();
    const emailService = new EmailService(
      {
        smtpServer: {
          host: "smtp.my-bank.com",
          port: 1234,
        },
        senderAddress: "unusual-spending@service.my-bank.com",
      },
      smtpClient,
    );
    const events = captureEventsNew(emailService.events);

    await emailService.sendEmailToCustomer(
      "customer-123",
      "Important message",
      "The message content",
    );

    expect(events.data()).toEqual([
      {
        type: "emailSentToCustomer",
        payload: {
          customerId: "customer-123",
          subject: "Important message",
          body: "The message content",
        },
      },
    ]);
  });

  it("should not emit an event sending the email failed", async () => {
    const expectedError = new Error("Send failed");

    // We configure the Null `SmtpClient` instance to throw a custom error when
    // trying to send an email.
    const smtpClient = SmtpClient.createNull({
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
      smtpClient,
    );
    const events = captureEventsNew(emailService.events);

    await emailService
      .sendEmailToCustomer(
        "customer-123",
        "Important message",
        "The message content",
      )
      .catch((error) => {
        if (error !== expectedError) {
          throw error;
        }
      });

    expect(events.data()).toEqual([]);
  });
});
