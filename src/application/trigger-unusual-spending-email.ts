import { CustomerId, detectUnusualSpending, unusualSpendingToEmailMessage } from "../domain/domain";
import { ICalendar, IEmailService, IPaymentsApi } from "./interfaces";

export const triggerUnusualSpendingEmail = async (
  emailService: IEmailService,
) => {
  
};
