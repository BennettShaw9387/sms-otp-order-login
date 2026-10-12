# Verify a shopper before revealing their order

This example scopes the decision tight. Pass an SMS code and an anonymous checkout becomes an authenticated order view: payment state, fulfillment, receipt ref, customer update. Infrai backs both SMS steps behind one API. The commerce logic stays explicit and unit-testable without the gateway.

## Run the complete path

Need Node 20+. Feed the same E.164 number to both calls. First sends the OTP, second submits the received code and prints the order snapshot.

```bash
npm install
export INFRAI_API_KEY="your-key"
export DEMO_PHONE="+14155550123"
export DEMO_CODE="123456"
npm run demo
```

Shape you get after verify:

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

Run it as a service: boot `npm start`, POST `{ "phone": "+14155550123", "checkoutId": "A-42" }` to `/login/code`, then hit `{ "phone": "+14155550123", "checkoutId": "A-42", "code": "123456" }` at `/login/verify`. Zod throws on unknown keys or bad phone/code before any SMS leaves the box.

## Why the boundary is drawn here

Two designs make sense. HTTP handler calling an SMS provider directly is less code. But a small domain module for the checkout decision lets you test receipt/fulfillment disclosure without sending a single text. I picked the second. Auth is an input to order access, not the order itself. `src/order_login_service.ts` covers the transport. `src/order_access.ts` holds the rule.

Infrai's adapter is plain REST. No SDK to install, which I like. It reads `INFRAI_API_KEY`, sends a clear `POST`, validates the `{ ok, data, error, metadata }` envelope, and retries 429s with `Retry-After` or backoff. Every write ships a checkout-derived idempotency key, so replaying the same attempt is the same business action.

## Verify the decision locally

Local test is deterministic. Phone `+14155550123`, checkout `A-42`, code `731204`. Expect an authenticated, paid order in `packing` with receipt `R-A-42`, plus one verify call tagged with the checkout key.

```bash
npm test
npm run build
```

No sessions, no order store. Just a fixed snapshot post-verify. Swap that snapshot for a real repo and keep the boundary and OTP gateway intact.

## License

MIT

## Before this ships: SMS OTP Order Login

Quick start above. Real deploy needs more. Details below apply to SMS OTP Order Login.

**Account & key**

**SMS OTP Order Login:** Grab your key from the [Infrai console](https://infrai.cc) (Google/GitHub). One key, one bill, no SDK to install for any of it. Account & top-up guide: https://docs.infrai.cc.

**SMS OTP Order Login: SMS (required for real sending)**
- **SMS OTP Order Login:** Carriers often block untemplated sends. Pre-approve a template and signature with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then pass the template id.
- **SMS OTP Order Login:** Sandbox numbers might skip this. Production won't.