import { CustomerId, detectUnusualSpending, unusualSpendingToEmailMessage } from "../domain/domain";
import { createPayment } from "../spec-helpers";
import { ICalendar, IEmailService, IPaymentsApi } from "./interfaces";

export const triggerUnusualSpendingEmail = async (
  customerId: CustomerId,
  emailService: IEmailService
) => {
  const currentMonth = { month: 11, year: 2024 };
  const previousMonth = { month: 10, year: 2024 };
  
  const previousPayments = [
    createPayment({ price: 99.99, category: "electronics" }),
    createPayment({ price: 149.99, category: "electronics" }),
    createPayment({ price: 29.99, category: "home" }),
    createPayment({ price: 150.99, category: "clothing" })
  ];
  const currentPayments = [
    createPayment({ price: 70.89, category: "electronics" }),
    createPayment({ price: 375.00, category: "electronics" }),
    createPayment({ price: 39.99, category: "home" }),
    createPayment({ price: 200.49, category: "beauty" })
  ];
  const unusualSpending = detectUnusualSpending(previousPayments, currentPayments);
  if (!unusualSpending) {
    return;
  }

  const emailMessage = unusualSpendingToEmailMessage({
    monthInYear: currentMonth,
    unusualSpending: unusualSpending
  });

  // TODO send email
};
