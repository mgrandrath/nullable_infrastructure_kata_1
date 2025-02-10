import { CustomerId, MonthInYear, Payment } from "../domain/domain";

export interface ICalendar {
  getCurrentMonthAndYear: () => MonthInYear;
  getPreviousMonthAndYear: () => MonthInYear;
}

export interface IPaymentApi {
  fetchUserPaymentsByMonth: (
    customerId: CustomerId,
    monthInYear: MonthInYear,
  ) => Promise<Payment[]>;
}

export interface IEmailService {
  sendEmailToCustomer: (
    customerId: CustomerId,
    subject: string,
    body: string,
  ) => Promise<void>;
}
