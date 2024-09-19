import {
  CustomerId,
  detectUnusualSpending,
  MonthInYear,
  Payment,
  unusualSpendingToEmailMessage,
} from "./domain";

export interface ICalendar {
  getCurrentMonthAndYear: () => MonthInYear;
  getPreviousMonthAndYear: () => MonthInYear;
}

export interface IPaymentsApi {
  fetchUserPaymentsByMonth: (
    customerId: CustomerId,
    monthInYear: MonthInYear
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
  const currentMonth = calendar.getCurrentMonthAndYear();
  const previousMonth = calendar.getPreviousMonthAndYear();

  const currentPayments = await paymentsApi.fetchUserPaymentsByMonth(
    customerId,
    currentMonth
  );
  const previousPayments = await paymentsApi.fetchUserPaymentsByMonth(
    customerId,
    previousMonth
  );

  const unusualSpending = detectUnusualSpending(
    previousPayments,
    currentPayments
  );
  if (!unusualSpending) {
    return;
  }

  const emailMessage = unusualSpendingToEmailMessage({
    monthInYear: currentMonth,
    unusualSpending,
  });
  await emailService.sendEmailToCustomer(
    customerId,
    emailMessage.subject,
    emailMessage.body
  );
};
