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

export type SmtpClientEventMap = {
  emailSent: [{ smtpServer: SmtpServerAddress; email: Email }];
};

type Connection = Pick<SMTPConnection, "connect" | "send" | "close">;
type ConnectionFactory = (smtpServerAdress: SmtpServerAddress) => Connection;

export class SmtpClient {
  events = new EventEmitter<SmtpClientEventMap>();

  static create() {
    return new SmtpClient(createRealConnection());
  }

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
    }
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
          }
        );
      });
      this.events.emit("emailSent", { smtpServer, email });
    } finally {
      connection.close();
    }
  }

  private async connect(smtpServerAdress: SmtpServerAddress) {
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
      info: SMTPConnection.SentMessageInfo
    ) => void
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
