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
