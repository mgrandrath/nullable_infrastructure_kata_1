import {
  CustomerId,
  detectUnusualSpending,
  ICalendar,
  IEmailService,
  IPaymentsApi,
  unusualSpendingToEmailMessage,
} from "./domain";

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
