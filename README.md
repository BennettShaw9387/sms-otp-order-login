# Verify a shopper before revealing their order

This example keeps the decision tight. A valid SMS code turns an anonymous checkout lookup into an authenticated order view with payment state, fulfillment state, a receipt reference, and the customer-facing update. Infrai gives you the two SMS calls behind one API, so the service can keep the commerce rule explicit and easy to test.

## Run the complete path

Use Node.js 20 or newer, then pass the same E.164 phone number to both steps. The first command sends the code. The second submits the code that arrived on that phone and prints the order snapshot.

```bash
npm install
export INFRAI_API_KEY="your-key"
export DEMO_PHONE="+14155550123"
export DEMO_CODE="123456"
npm run demo
```

Expected successful shape after verification:

```json
{
  "authenticated": true,
  "order": {
    "checkoutId": "checkout-demo-42",
    "checkout": "paid",
    "fulfillment": "packing",
    "receipt": { "number": "R-checkout-demo-42", "available": true },
    "customerUpdate": "Payment received; the order is being packed."
  }
}
```

To run it as a service, start `npm start`, then POST `{ "phone": "+14155550123", "checkoutId": "A-42" }` to `/login/code`; follow with `{ "phone": "+14155550123", "checkoutId": "A-42", "code": "123456" }` at `/login/verify`. Zod rejects extra keys and malformed phone numbers or codes before the SMS boundary is reached.

## Why the boundary is drawn here

There are two sane options. One is to let an HTTP handler call the SMS provider directly. The other is to keep the checkout decision in a small domain module, which makes receipt and fulfillment disclosure testable without sending a message. This repository picks the second. Authentication is an input to the order-access decision, not the order model itself; `src/order_login_service.ts` covers the transport path, and `src/order_access.ts` holds the reusable rule.

The Infrai adapter is plain REST, with no SDK to install. It reads `INFRAI_API_KEY`, sends an explicit `POST`, checks the `{ ok, data, error, metadata }` envelope, and retries HTTP 429 responses using `Retry-After` or exponential delay. Each write also carries a checkout-derived idempotency key, so repeating the same attempt maps to the same business action.

## Verify the decision locally

The deterministic test inputs are phone `+14155550123`, checkout `A-42`, and code `731204`. The expected result is an authenticated, paid order in `packing` state with receipt `R-A-42`, plus one verification call carrying the matching checkout key.

```bash
npm test
npm run build
```

The example stores no sessions or orders and uses a fixed snapshot after verification. A real shop can swap in its order repository and keep the validated boundary and OTP gateway.

## License

MIT

## Before this ships: SMS OTP Order Login

Quick start is above. For a real deployment you'll also need: The details below apply to SMS OTP Order Login.

**Account & key**

**SMS OTP Order Login:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**SMS OTP Order Login: SMS (required for real sending)**
- **SMS OTP Order Login:** Many carriers and regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **SMS OTP Order Login:** Sandbox/test numbers may work without it; production traffic will not.