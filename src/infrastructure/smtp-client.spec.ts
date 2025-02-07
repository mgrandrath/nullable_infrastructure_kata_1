import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SMTPServer } from "smtp-server";
import { simpleParser as parseEmailStream } from "mailparser";
import { SmtpClient } from "./smtp-client";
import { captureEventsNew } from "../spec-helpers";

describe("SmtpClient", () => {
  // We use a real SMTP server in our tests in order to verify the actual core
  // side effect of the `SmtpClient` class. This test is part of our suite of
  // narrow tests that we run continuously. There is no need for a separate
  // integration test.
  let testHttpServer: TestSmtpServer;

  beforeAll(async () => {
    testHttpServer = new TestSmtpServer();
    await testHttpServer.start();
  });

  beforeEach(async () => {
    // Starting and stopping the server is a bit expensive. To speed up our
    // tests we start the server only once and reset its state after each test.
    testHttpServer.reset();
  });

  afterAll(async () => {
    if (testHttpServer) {
      await testHttpServer.stop();
    }
  });

  it("should send an email for real", async () => {
    // Let's create a real `SmtpClient` and actually send an email to our test
    // server.
    const smtpClient = SmtpClient.create();

    await smtpClient.sendEmail(
      {
        host: "localhost",
        port: testHttpServer.port(),
      },
      {
        from: "some-sender@example.com",
        to: "some-receiver@example.org",
        subject: "Important message",
        text: "Hello, World!",
      },
    );

    expect(testHttpServer.lastEmailReceived).toEqual({
      from: "some-sender@example.com",
      to: "some-receiver@example.org",
      subject: "Important message",
      text: "Hello, World!\n",
    });
  });

  it("should emit an event whenever an email has been sent", async () => {
    const smtpClient = SmtpClient.create();

    // There are other classes that use `SmtpClient` to send out emails. Testing
    // these other classes is challenging because `sendEmail` does not return
    // any meaningful data that we could use to detect if `sendEmail` has been
    // used correctly.
    //
    // Instead we have `SmtpClient` emit an `"emailSent"` event whenever an
    // email has been sent successfully. The difference to using a spy and
    // assert with what arguments `sendEmail` has been called is very subtle.
    // Asserting on the method arguments tells you how a class has been
    // interacted with. Asserting on emitted events tells you what side effects
    // have been triggered.
    //
    // `captureEvents` is a helper function that we use inside tests to capture
    // emitted events and convert them into an array. This makes it easier write
    // assertions for the expected events.
    const events = captureEventsNew(smtpClient.eventsNew);

    await smtpClient.sendEmail(
      {
        host: "localhost",
        port: testHttpServer.port(),
      },
      {
        from: "some-sender@example.com",
        to: "some-receiver@example.org",
        subject: "Important message",
        text: "Hello, World!",
      },
    );

    expect(events.data()).toEqual([
      {
        type: "emailSent",
        payload: {
          smtpServer: {
            host: "localhost",
            port: testHttpServer.port(),
          },
          email: {
            from: "some-sender@example.com",
            to: "some-receiver@example.org",
            subject: "Important message",
            text: "Hello, World!",
          },
        },
      },
    ]);
  });

  describe("null instance", () => {
    it("fails with a configurable error", async () => {
      const expectedError = new Error("Sending failed");

      // As with all Nullables the Null configuration should be as simple as
      // possible. In this particular use case we only need to be able to throw
      // errors when sending emails in order to verify that `EmailService`
      // handles errors from `SmtpClient` gracefully.
      const smtpClient = SmtpClient.createNull({
        errorOnSend: expectedError,
      });

      await expect(
        smtpClient.sendEmail(
          {
            host: "irrelevant.example.org",
            port: 123,
          },
          {
            from: "irrelevant@example.com",
            to: "irrelevant@example.org",
            subject: "irrelevant",
            text: "irrelevant",
          },
        ),
      ).rejects.toThrow(expectedError);
    });

    it("does not emit an event when sending the email failed", async () => {
      const expectedError = new Error("Sending failed");
      const smtpClient = SmtpClient.createNull({
        errorOnSend: expectedError,
      });
      const events = captureEventsNew(smtpClient.eventsNew);

      await smtpClient
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
          },
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

class TestSmtpServer {
  lastEmailReceived!: {
    from: string | undefined;
    to: string | undefined;
    subject: string | undefined;
    text: string | undefined;
  } | null;
  private _smtpServer: SMTPServer;

  constructor() {
    this._smtpServer = new SMTPServer({
      // To keep the complexity of this example manageable we skip transport
      // encryption and authentication. We would not disable these if this was a
      // real production app.
      disabledCommands: ["AUTH", "STARTTLS"],

      // Set up a listener for all incoming emails and record the last received
      // message.
      onData: (stream, _session, callback) => {
        parseEmailStream(stream)
          .then((email) => {
            // Our `SmtpClient` can only do eaxctly enough for the task at hand.
            // This means sending mails to a single receiver. There is no need
            // to add more complexity than we actually use.
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
    // Seting the listen port to `0` causes the server to choose a random
    // available port. This means that our tests don't have to rely on a
    // specific port to be available. The `port()` method below tells us the
    // actual port the test server listens on.
    const port = 0;

    return new Promise<void>((resolve, reject) => {
      this._smtpServer.on("error", reject);
      this._smtpServer.listen(port, resolve);
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
        "Server is not running. Please call `start()` before calling `port()`.",
      );
    }
    if (typeof address === "string") {
      throw new Error(
        "Server is listening on a pipe or socket. There is no port available.",
      );
    }

    return address.port;
  }
}
