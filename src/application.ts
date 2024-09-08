import {
  CustomerId,
  detectUnusualSpending,
  Month,
  Payment,
  unusualSpendingToEmailMessage,
  Year,
} from "./domain";

export interface ICalendar {
  getCurrentMonthAndYear: () => { month: Month; year: Year };
  getPreviousMonthAndYear: () => { month: Month; year: Year };
}

export interface IPaymentsApi {
  fetchUserPaymentsByMonth: (
    customerId: CustomerId,
    year: Year,
    month: Month
  ) => Promise<Payment[]>;
}

export interface IEmailService {
  sendEmailToCustomer: (
    customerId: CustomerId,
    subject: string,
    body: string
  ) => Promise<void>;
}

// This function connects domain logic and infrastructure (also known as side
// effects). It uses the A-Frame pattern [^1]. The pure domain logic functions
// `detectUnusualSpending` and `unusualSpendingToEmailMessage` are sandwiched
// between the interactions with the outside world (getting the current month,
// fetching payments from the API, and sending an email).
//
// The function `triggerUnusualSpendingEmail` does not implement any logic
// itself. Its only responsibility is to wire things together.
//
// [^1]: https://www.jamesshore.com/v2/projects/nullables/testing-without-mocks#a-frame-arch
export const triggerUnusualSpendingEmail = async (
  calendar: ICalendar,
  paymentsApi: IPaymentsApi,
  emailService: IEmailService,
  customerId: CustomerId
) => {
  const current = calendar.getCurrentMonthAndYear();
  const previous = calendar.getPreviousMonthAndYear();

  const currentPayments = await paymentsApi.fetchUserPaymentsByMonth(
    customerId,
    current.year,
    current.month
  );
  const previousPayments = await paymentsApi.fetchUserPaymentsByMonth(
    customerId,
    previous.year,
    previous.month
  );

  const unusualSpending = detectUnusualSpending(
    previousPayments,
    currentPayments
  );
  if (!unusualSpending) {
    return;
  }

  const emailMessage = unusualSpendingToEmailMessage(unusualSpending);
  await emailService.sendEmailToCustomer(
    customerId,
    emailMessage.subject,
    emailMessage.body
  );
};
