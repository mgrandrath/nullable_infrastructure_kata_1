import EventEmitter from "events";
import MailComposer from "nodemailer/lib/mail-composer";
import SMTPConnection, { SMTPError } from "nodemailer/lib/smtp-connection";
import { Readable } from "stream";

export type Email = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

export type SmtpServerAddress = {
  host: string;
  port: number;
};

export type NullConfiguration = {
  errorOnSend?: SMTPError;
};

// The event map defines the events that the `SmtpClient` emits. In this case it
// emits `"emailSent"` events with `smtpServer` and `email` properties. The
// reason the event schema is wrapped in an array is that the native Node.js
// event emitters allow emitting an arbitrary number of arguments for any event
// type.
export type SmtpClientEventMap = {
  emailSent: [{ smtpServer: SmtpServerAddress; email: Email }];
};

// We create a subset of the third party `SMTPConnection` interface that we
// actually use in our implementation. This subset can grow over time as needed.
type Connection = Pick<SMTPConnection, "connect" | "send" | "close">;
type ConnectionFactory = (smtpServerAdress: SmtpServerAddress) => Connection;

export class SmtpClient {
  // Create an `EventEmitter` instance that is used for Output Tracking[^1] in
  // tests. This implementation deviates from James Shore's original approach of
  // creating `OutputTracker` objects. In my opinion using an `EventEmitter` is
  // more flexible and enables other uses such as logging.
  //
  // [^1] https://www.jamesshore.com/v2/projects/nullables/testing-without-mocks#output-tracking
  events = new EventEmitter<SmtpClientEventMap>();

  // The `create` factory method creates an instance with the real side effect.
  // In this case this is creating `SMTPConnection` instances provided by the
  // `nodemailer` package.
  static create() {
    return new SmtpClient(createRealConnection());
  }

  // The `createNull` facory method creates an instance with a configured stub
  // instead of the actual side effect. Notice that we only stub out external
  // code (in this case the `SMTPConnection` class provided by the `nodemailer`
  // package), never our own classes.
  static createNull(nullConfiguration?: NullConfiguration) {
    return new SmtpClient(createNullConnection(nullConfiguration));
  }

  constructor(private _createConnection: ConnectionFactory) {}

  async sendEmail(
    smtpServer: SmtpServerAddress,
    email: {
      from: string;
      to: string;
      subject: string;
      text: string;
    },
  ) {
    const connection = await this.connect(smtpServer);

    try {
      const message = new MailComposer({
        from: email.from,
        to: email.to,
        subject: email.subject,
        text: email.text,
      }).compile();

      await new Promise((resolve, reject) => {
        connection.send(
          message.getEnvelope(),
          message.createReadStream(),
          (error, info) => {
            if (error) {
              reject(error);
              return;
            }

            resolve(info);
          },
        );
      });

      // We emit an event that the email has been sent. We deliberately call
      // `emit` *after* the side effect so that it is not emitted when sending
      // the request failed with an error.
      this.events.emit("emailSent", { smtpServer, email });
    } finally {
      connection.close();
    }
  }

  private async connect(smtpServerAdress: SmtpServerAddress) {
    // We use the injected `_createConnection` function without knowing if it is
    // the real one or the stub. All the code in this method gets executed
    // inside our tests.
    const connection = this._createConnection(smtpServerAdress);

    await new Promise<void>((resolve, reject) => {
      connection.connect((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    return connection;
  }
}

const createRealConnection =
  (): ConnectionFactory => (smtpServerAdress: SmtpServerAddress) =>
    new SMTPConnection({
      host: smtpServerAdress.host,
      port: smtpServerAdress.port,
    });

const createNullConnection =
  (nullConfiguration: NullConfiguration = {}) =>
  () =>
    new NullConnection(nullConfiguration);

// The embedded stub only implements the bare minimum so that it can work with
// the above implementation. We don't want to implement an elaborate fake object
// but rather keep it as simple as possible. Here, this means we only implement
// the `connect`, `send`, and `close` methods. The tight coupling between the
// `SmtpClient` class above and this stub is the reason we implement both in the
// same file.
class NullConnection implements Connection {
  constructor(private _configuration: NullConfiguration) {}

  connect(callback: (error?: SMTPConnection.SMTPError) => void): void {
    setImmediate(() => {
      callback(undefined);
    });
  }

  send(
    _envelope: SMTPConnection.Envelope,
    _message: string | Buffer | Readable,
    callback: (
      err: SMTPConnection.SMTPError | null,
      info: SMTPConnection.SentMessageInfo,
    ) => void,
  ): void {
    setImmediate(() => {
      callback(this._configuration.errorOnSend ?? null, {
        accepted: [],
        rejected: [],
        response: "",
        envelopeTime: 0,
        messageTime: 0,
        messageSize: 0,
      });
    });
  }

  close(): void {}
}
