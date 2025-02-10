import {
  detectUnusualSpending,
  unusualSpendingToEmailMessage,
} from "../domain/domain";
import { Calendar } from "../infrastructure/calendar";
import { EmailService } from "../infrastructure/email-service";
import { PaymentApi } from "../infrastructure/payment-api";
import { ICalendar, IEmailService, IPaymentApi } from "./interfaces";

export type ApplicationConfiguration = {
  baseUrl: URL;
  smtpServer: { host: string; port: number };
  senderAddress: string;
};

export class Application {
  static create(configuration: ApplicationConfiguration) {
    return new Application(
      Calendar.create(),
      PaymentApi.create({ baseUrl: configuration.baseUrl }),
      EmailService.create({
        senderAddress: configuration.senderAddress,
        smtpServer: configuration.smtpServer,
      }),
    );
  }

  constructor(
    private calendar: ICalendar,
    private paymentsApi: IPaymentApi,
    private emailService: IEmailService,
  ) {}

  // This method connects domain logic and infrastructure (also known as side
  // effects). It uses the A-Frame pattern [^1]. The pure domain logic functions
  // `detectUnusualSpending` and `unusualSpendingToEmailMessage` are sandwiched
  // between the interactions with the outside world (getting the current month,
  // fetching payments from the API, and sending an email).
  //
  // The method `triggerUnusualSpendingEmail` does not implement any logic
  // itself. Its only responsibility is to wire things together.
  //
  // [^1]: https://www.jamesshore.com/v2/projects/nullables/testing-without-mocks#a-frame-arch

  async triggerUnusualSpendingEmail(customerId: string) {
    const currentMonth = this.calendar.getCurrentMonthAndYear();
    const previousMonth = this.calendar.getPreviousMonthAndYear();

    const currentPayments = await this.paymentsApi.fetchUserPaymentsByMonth(
      customerId,
      currentMonth,
    );
    const previousPayments = await this.paymentsApi.fetchUserPaymentsByMonth(
      customerId,
      previousMonth,
    );

    const unusualSpending = detectUnusualSpending(
      previousPayments,
      currentPayments,
    );
    if (!unusualSpending) {
      return;
    }

    const emailMessage = unusualSpendingToEmailMessage({
      monthInYear: currentMonth,
      unusualSpending,
    });
    await this.emailService.sendEmailToCustomer(
      customerId,
      emailMessage.subject,
      emailMessage.body,
    );
  }
}
