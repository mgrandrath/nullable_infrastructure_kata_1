import {
  CustomerId,
  detectUnusualSpending,
  unusualSpendingToEmailMessage,
} from "../domain/domain";
import { ICalendar, IEmailService, IPaymentsApi } from "./interfaces";

export const triggerUnusualSpendingEmail = async () => {
  const currentMonth = { year: 2024, month: 11 };
  const previousMonth = { year: 2024, month: 10 };

  const currentPayments = [
    { price: 99.99, category: "electronics", description: "irrelevant" },
    { price: 149.99, category: "electronics", description: "irrelevant" },
    { price: 29.99, category: "home", description: "irrelevant" },
    { price: 150.99, category: "clothing", description: "irrelevant" },
  ];
  const previousPayments = [
    { price: 70.89, category: "electronics", description: "irrelevant" },
    { price: 375.0, category: "electronics", description: "irrelevant" },
    { price: 39.99, category: "home", description: "irrelevant" },
    { price: 200.49, category: "beauty", description: "irrelevant" },
  ];

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

  // todo send email
};
