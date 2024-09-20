import { Calendar } from "./infrastructure/calendar";
import { EmailService } from "./infrastructure/email-service";
import { PaymentApi } from "./infrastructure/payment-api";
import { triggerUnusualSpendingEmail } from "./application/trigger-unusual-spending-email";

const API_URL = "http://localhost:3000/";
const EMAIL_SENDER_ADDRESS = "unusual-spending@my-bank.example.com";
const SMTP_HOST = "localhost";
const SMTP_PORT = 2525;

const customerId = "customer-123";

const calendar = Calendar.create();
const paymentApi = PaymentApi.create({ baseUrl: new URL(API_URL) });
const emailService = EmailService.create({
  senderAddress: EMAIL_SENDER_ADDRESS,
  smtpServer: { host: SMTP_HOST, port: SMTP_PORT },
});

triggerUnusualSpendingEmail(calendar, paymentApi, emailService, customerId)
  .then(() => {
    console.log("Check successful");
  })
  .catch((error) => {
    console.error("ERROR:", error);
    process.exit(1);
  });
