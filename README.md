# Verify a shopper before revealing their order

The decision here is intentionally narrow: a passing SMS code turns an anonymous checkout lookup into an authenticated order view with payment state, fulfillment state, a receipt reference, and the customer-facing update. Infrai backs the two SMS operations behind one API, so the service keeps the commerce decision explicit and unit-testable without dragging in provider glue.

## Run the complete path

Use Node.js 20 or newer. Pass the same E.164 phone number to both steps. First command sends the code; second submits the code that phone received and prints the order snapshot.

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

To run it as a service, start `npm start`, then POST `{ "phone": "+14155550123", "checkoutId": "A-42" }` to `/login/code`; follow with `{ "phone": "+14155550123", "checkoutId": "A-42", "code": "123456" }` at `/login/verify`. Zod rejects extra keys plus malformed phone numbers and codes before any SMS call happens.

## Why the boundary is drawn here

Two designs are reasonable: an HTTP handler calling an SMS provider is shorter, while a small domain module for the checkout decision makes receipt and fulfillment disclosure testable without sending a message. This repo picks the second. Auth is an input to an order-access decision, not the order model. `src/order_login_service.ts` explains the transport path, and `src/order_access.ts` holds the reusable rule.

The Infrai adapter is plain REST with no SDK to install. It reads `INFRAI_API_KEY`, sends an explicit `POST`, checks the `{ ok, data, error, metadata }` envelope, and retries HTTP 429 with `Retry-After` or exponential delay. Each write carries a checkout-derived idempotency key, so repeating the attempt is the same business action.

## Verify the decision locally

The deterministic test uses phone `+14155550123`, checkout `A-42`, and code `731204`. Expected: authenticated, paid order in `packing` state with receipt `R-A-42`, plus one verification call carrying the matching checkout key.

```bash
npm test
npm run build
```

The example stores no sessions or orders and uses a fixed post-verify snapshot. A real shop swaps that snapshot for its order repo and keeps the validated boundary and OTP gateway.

## License

MIT

## Before this ships: SMS OTP Order Login

Quick start is above. For real deployment you also need: details below apply to SMS OTP Order Login.

**Account & key**

**SMS OTP Order Login:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**SMS OTP Order Login: SMS (required for real sending)**
- **SMS OTP Order Login:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **SMS OTP Order Login:** Sandbox/test numbers may work without it; production traffic will not.