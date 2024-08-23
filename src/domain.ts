export type CustomerId = string;
export type Year = number;
export type Month = number;

export type Payment = {
  price: number;
  description: string;
  category: string;
};

export type UnusualSpending = {
  [category: string]: {
    spending: number;
    before: number;
  };
};

export const unusualSpendingToEmailMessage = (
  unusualSpending: UnusualSpending
) => {
  const categories = Object.keys(unusualSpending);
  if (categories.length === 0) {
    return null;
  }

  const totalSpending = categories
    .map((category) => unusualSpending[category]!.spending)
    .reduce((totalSpending, spending) => totalSpending + spending, 0);
  const subject = `Unusual spending of $${totalSpending} detected!`;

  const body = [
    "Hello card user!",
    "",
    "We have detected unusually high spending on your card in these categories:",
    "",
    ...categories.map(
      (category) =>
        `* You spent $${unusualSpending[category]?.spending} on ${category}`
    ),
    "",
    "Love,",
    "",
    "The Credit Card Company",
  ].join("\n");

  return {
    subject,
    body,
  };
};

const isUnusualSpending = (spending: number, before: number) =>
  spending >= before * 1.5;

export const detectUnusualSpending = (
  lastMonth: Payment[],
  thisMonth: Payment[]
): UnusualSpending => {
  const lastSpending = groupPaymentsByCategory(lastMonth);
  const currentSpending = groupPaymentsByCategory(thisMonth);

  return Object.fromEntries(
    Object.keys(currentSpending).flatMap((category) => {
      const spending = currentSpending[category] ?? 0;
      const before = lastSpending[category] ?? 0;

      return isUnusualSpending(spending, before)
        ? [[category, { spending, before }]]
        : [];
    })
  );
};

export const groupPaymentsByCategory = (payments: Payment[]) => {
  return payments.reduce(
    (acc, payment) => ({
      ...acc,
      [payment.category]: (acc[payment.category] ?? 0) + payment.price,
    }),
    {} as Record<string, number>
  );
};