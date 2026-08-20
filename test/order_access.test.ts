import assert from "node:assert/strict";
import test from "node:test";
import { verifyOrderAccess, type OtpGateway } from "../src/order_access.js";

test("a verified checkout becomes an authenticated order view", async () => {
  const calls: string[] = [];
  const gateway: OtpGateway = {
    async send() { throw new Error("send is not part of verification"); },
    async verify(phone, code, requestKey) {
      calls.push(`${phone}|${code}|${requestKey}`);
    },
  };

  const result = await verifyOrderAccess({
    phone: "+14155550123",
    checkoutId: "A-42",
    code: "731204",
  }, gateway);

  assert.deepEqual(calls, ["+14155550123|731204|checkout:A-42:verify:731204"]);
  assert.equal(result.authenticated, true);
  assert.deepEqual(result.order, {
    checkoutId: "A-42",
    checkout: "paid",
    fulfillment: "packing",
    receipt: { number: "R-A-42", available: true },
    customerUpdate: "Payment received; the order is being packed.",
  });
});
