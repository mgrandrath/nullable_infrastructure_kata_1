import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SMTPServer } from "smtp-server";
import { simpleParser as parseEmailStream } from "mailparser";
import { EmailClient } from "./email-client";
import { captureEvents } from "../spec-helpers";

describe("EmailClient", () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = new TestServer();
    await testServer.start();
  });

  beforeEach(async () => {
    testServer.reset();
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
    }
  });

  it("should send an email for real", async () => {
    const emailClient = EmailClient.create();

    await emailClient.sendEmail(
      {
        host: "localhost",
        port: testServer.port(),
      },
      {
        from: "some-sender@example.com",
        to: "some-receiver@example.org",
        subject: "Important message",
        text: "Hello, World!",
      }
    );

    expect(testServer.lastEmailReceived).toEqual({
      from: "some-sender@example.com",
      to: "some-receiver@example.org",
      subject: "Important message",
      text: "Hello, World!\n",
    });
  });

  it("should emit an event whenever an email has been sent", async () => {
    const emailClient = EmailClient.create();
    const events = captureEvents(emailClient.events, "emailSent");

    await emailClient.sendEmail(
      {
        host: "localhost",
        port: testServer.port(),
      },
      {
        from: "some-sender@example.com",
        to: "some-receiver@example.org",
        subject: "Important message",
        text: "Hello, World!",
      }
    );

    expect(events.data()).toEqual([
      {
        smtpServer: {
          host: "localhost",
          port: testServer.port(),
        },
        email: {
          from: "some-sender@example.com",
          to: "some-receiver@example.org",
          subject: "Important message",
          text: "Hello, World!",
        },
      },
    ]);
  });

  describe("null instance", () => {
    it("fails with a configurable error", async () => {
      const expectedError = new Error("Sending failed");
      const emailClient = EmailClient.createNull({
        errorOnSend: expectedError,
      });

      await expect(
        emailClient.sendEmail(
          {
            host: "irrelevant.example.org",
            port: 123,
          },
          {
            from: "irrelevant@example.com",
            to: "irrelevant@example.org",
            subject: "irrelevant",
            text: "irrelevant",
          }
        )
      ).rejects.toThrow(expectedError);
    });

    it("does not emit an event when sending the email failed", async () => {
      const expectedError = new Error("Sending failed");
      const emailClient = EmailClient.createNull({
        errorOnSend: expectedError,
      });
      const events = captureEvents(emailClient.events, "emailSent");

      await emailClient
        .sendEmail(
          {
            host: "irrelevant.example.org",
            port: 123,
          },
          {
            from: "irrelevant@example.com",
            to: "irrelevant@example.org",
            subject: "irrelevant",
            text: "irrelevant",
          }
        )
        .catch((error) => {
          if (error !== expectedError) {
            throw error;
          }
        });

      expect(events.data()).toEqual([]);
    });
  });
});

class TestServer {
  lastEmailReceived!: {
    from: string | undefined;
    to: string | undefined;
    subject: string | undefined;
    text: string | undefined;
  } | null;
  private _smtpServer: SMTPServer;

  constructor() {
    this._smtpServer = new SMTPServer({
      disabledCommands: ["AUTH", "STARTTLS"],

      onData: (stream, _session, callback) => {
        parseEmailStream(stream)
          .then((email) => {
            const to = Array.isArray(email.to) ? email.to[0] : email.to;

            this.lastEmailReceived = {
              from: email.from?.value[0]?.address,
              to: to?.value[0]?.address,
              subject: email.subject,
              text: email.text,
            };
            callback(null);
          })
          .catch(callback);
      },
    });

    this.reset();
  }

  reset() {
    this.lastEmailReceived = null;
  }

  async start() {
    return new Promise<void>((resolve) => {
      this._smtpServer.listen(0, () => {
        resolve();
      });
    });
  }

  async stop() {
    await new Promise<void>((resolve) => {
      this._smtpServer.close(resolve);
    });
  }

  port() {
    const address = this._smtpServer.server.address();
    if (!address) {
      throw new Error(
        "Server is not running. Please call `start()` before calling `port()`."
      );
    }
    if (typeof address === "string") {
      throw new Error(
        "Server is listening on a pipe or socket. There is no port available."
      );
    }

    return address.port;
  }
}
