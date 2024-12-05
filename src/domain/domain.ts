export type CustomerId = string;

export type MonthInYear = {
  month: number;
  year: number;
};

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

export const unusualSpendingToEmailMessage = ({
  monthInYear: { month, year },
  unusualSpending,
}: {
  monthInYear: MonthInYear;
  unusualSpending: UnusualSpending;
}) => {
  const categories = Object.keys(unusualSpending);
  if (categories.length === 0) {
    throw new TypeError("Cannot create an email message from an empty object");
  }

  const paddedMonth = month.toString().padStart(2, "0");
  const totalSpending = categories
    .map((category) => unusualSpending[category]!.spending)
    .reduce((totalSpending, spending) => totalSpending + spending, 0);
  const subject = `Unusual spending of $${totalSpending} detected!`;

  const body = [
    "Hello card user!",
    "",
    `We have detected unusually high spending on your card in these categories in ${year}-${paddedMonth}:`,
    "",
    ...categories.map(
      (category) =>
        `* You spent $${unusualSpending[category]?.spending} on ${category}`,
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
  thisMonth: Payment[],
): UnusualSpending => {
  const lastSpending = groupPaymentsByCategory(lastMonth);
  const currentSpending = groupPaymentsByCategory(thisMonth);
  const spendingEntries = Object.keys(currentSpending).flatMap((category) => {
    const spending = currentSpending[category] ?? 0;
    const before = lastSpending[category] ?? 0;

    return isUnusualSpending(spending, before)
      ? [[category, { spending, before }]]
      : [];
  });

  return spendingEntries.length > 0
    ? Object.fromEntries(spendingEntries)
    : null;
};

export const groupPaymentsByCategory = (payments: Payment[]) => {
  return payments.reduce(
    (acc, { category, price }) => ({
      ...acc,
      [category]: (acc[category] ?? 0) + price,
    }),
    {} as Record<string, number>,
  );
};
