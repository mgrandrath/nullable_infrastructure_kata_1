import { Application } from "./application/application";

const API_URL = "http://localhost:3000/";
const EMAIL_SENDER_ADDRESS = "unusual-spending@my-bank.example.com";
const SMTP_HOST = "localhost";
const SMTP_PORT = 2525;

const customerId = "customer-123";

const application = Application.create({
  baseUrl: new URL(API_URL),
  senderAddress: EMAIL_SENDER_ADDRESS,
  smtpServer: { host: SMTP_HOST, port: SMTP_PORT },
});

application
  .triggerUnusualSpendingEmail(customerId)
  .then(() => {
    console.log("Check successful");
  })
  .catch((error) => {
    console.error("ERROR:", error);
    process.exit(1);
  });
