import { describe, it } from "vitest";
import { triggerUnusualSpendingEmail } from "./trigger-unusual-spending-email";

describe("triggerUnusualSpendingEmail", () => {
  it("should send an email when unusual spending is detected", async () => {
    // TODO
  });
});



const expectedSubject = "Unusual spending of $646.38 detected!";
const expectedBody = [
  "Hello card user!",
  "",
  "We have detected unusually high spending on your card in these categories in 2024-11:",
  "",
  "* You spent $445.89 on electronics",
  "* You spent $200.49 on beauty",
  "",
  "Love,",
  "",
  "The Credit Card Company"
].join("\n");
