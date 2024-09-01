import EventEmitter from "events";
import { CustomerId } from "../domain";
import { IEmailService } from "../trigger-unusual-spending-email";
import { SmtpClient, SmtpServerAddress } from "./smtp-client";

export type EmailServiceConfiguration = {
  smtpServer: SmtpServerAddress;
  senderAddress: string;
};

export type EmailServiceEventMap = {
  emailSentToCustomer: [
    {
      customerId: CustomerId;
      subject: string;
      body: string;
    }
  ];
};

export class EmailService implements IEmailService {
  events = new EventEmitter<EmailServiceEventMap>();

  static create(configuration: EmailServiceConfiguration) {
    return new EmailService(configuration, SmtpClient.create());
  }

  static createNull() {
    const configuration: EmailServiceConfiguration = {
      smtpServer: {
        host: "null-smtp.example.org",
        port: 1,
      },
      senderAddress: "null-sender@example.org",
    };
    return new EmailService(configuration, SmtpClient.createNull());
  }

  constructor(
    private _configuration: EmailServiceConfiguration,
    private _smtpClient: SmtpClient
  ) {}

  async sendEmailToCustomer(
    customerId: CustomerId,
    subject: string,
    body: string
  ) {
    await this._smtpClient.sendEmail(this._configuration.smtpServer, {
      from: this._configuration.senderAddress,
      to: `${customerId}@customer.my-bank.com`,
      subject,
      text: body,
    });
    this.events.emit("emailSentToCustomer", { customerId, subject, body });
  }
}
