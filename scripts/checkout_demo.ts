import { requestOrderCode, verifyOrderAccess } from "../src/order_access.js";

const phone = process.env.DEMO_PHONE;
const code = process.env.DEMO_CODE;
if (!phone || !code) throw new Error("DEMO_PHONE and DEMO_CODE are required");

const input = { phone, checkoutId: "checkout-demo-42" };
console.log(await requestOrderCode(input));
console.log(await verifyOrderAccess({ ...input, code }));
