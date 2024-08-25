import EventEmitter from "events";
import { CustomerId } from "../domain";
import { IEmailService } from "../trigger-unusual-spending-email";
import { EmailClient, SmtpServerAddress } from "./email-client";

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

  static createNull() {
    const configuration: EmailServiceConfiguration = {
      smtpServer: {
        host: "null-smtp.example.org",
        port: 1,
      },
      senderAddress: "null-sender@example.org",
    };
    return new EmailService(configuration, EmailClient.createNull());
  }

  static create(configuration: EmailServiceConfiguration) {
    return new EmailService(configuration, EmailClient.create());
  }

  constructor(
    private _configuration: EmailServiceConfiguration,
    private _emailClient: EmailClient
  ) {}

  async sendEmailToCustomer(
    customerId: CustomerId,
    subject: string,
    body: string
  ) {
    await this._emailClient.sendEmail(this._configuration.smtpServer, {
      from: this._configuration.senderAddress,
      to: `${customerId}@customer.my-bank.com`,
      subject,
      text: body,
    });
    this.events.emit("emailSentToCustomer", { customerId, subject, body });
  }
}
