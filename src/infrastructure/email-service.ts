import EventEmitter from "events";
import { CustomerId } from "../domain/domain";
import { SmtpClient, SmtpServerAddress } from "./smtp-client";
import { IEmailService } from "../application/interfaces";

export type EmailServiceConfiguration = {
  smtpServer: SmtpServerAddress;
  senderAddress: string;
};

// The event map defines the events that the `EmailService` emits. In this case
// it emits `"emailSentToCustomer"` events with `customerId`, `subject`, and
// `body` properties. The reason the event schema is wrapped in an array is that
// the native Node.js event emitters allow emitting an arbitrary number of
// arguments for any event type.
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
  // Create an `EventEmitter` instance that is used for Output Tracking[^1] in
  // tests. This implementation deviates from James Shore's original approach of
  // creating `OutputTracker` objects. In my opinion using an `EventEmitter` is
  // more flexible and enables other uses such as logging.
  //
  // [^1] https://www.jamesshore.com/v2/projects/nullables/testing-without-mocks#output-tracking
  events = new EventEmitter<EmailServiceEventMap>();

  // The `create` factory method creates an instance with the real side effect.
  // In this case a real `SmtpClient` instance.
  static create(configuration: EmailServiceConfiguration) {
    return new EmailService(configuration, SmtpClient.create());
  }

  // The `createNull` facory method creates an instance with a Null instance of
  // the `SmtpClient`. We also provide a default configuration for the
  // `EmailService`.
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
    // We use the injected `_smtpClient` instance without knowing if it is the
    // real one or the Nulled version. All the code in this method gets executed
    // inside our tests.
    await this._smtpClient.sendEmail(this._configuration.smtpServer, {
      from: this._configuration.senderAddress,
      to: `${customerId}@customer.my-bank.com`,
      subject,
      text: body,
    });

    // We emit an event that the email has been sent to the customer. We
    // deliberately call `emit` *after* the side effect so that it is not
    // emitted when sending the email failed with an error.
    this.events.emit("emailSentToCustomer", { customerId, subject, body });
  }
}
