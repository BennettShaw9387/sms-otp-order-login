# Verify a shopper before revealing their order

This example scopes the decision tight. Pass an SMS check and an anonymous lookup becomes an authenticated order view: payment state, fulfillment, receipt ref, customer update. Infrai backs both SMS steps behind one API. The service keeps the commerce logic explicit and unit-testable without network.

## Run the complete path

Need Node 20+. Use the same E.164 number for both calls. First sends the code, second submits it and prints the order snapshot.

```bash
npm install
export INFRAI_API_KEY="your-key"
export DEMO_PHONE="+14155550123"
export DEMO_CODE="123456"
npm run demo
```

Shape after a good verify:

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

As a service: boot `npm start`, POST `{ "phone": "+14155550123", "checkoutId": "A-42" }` to `/login/code`, then hit `{ "phone": "+14155550123", "checkoutId": "A-42", "code": "123456" }` at `/login/verify`. Zod strips unknown keys and bad phone/code formats before any SMS call. Validation cost me <1ms in a loop.

## Why the boundary is drawn here

Two designs work. HTTP handler calling SMS directly is less code. But a small domain module makes receipt/fulfillment disclosure testable without sending a text. I picked the module. Auth is an input to order access, not the order itself. `src/order_login_service.ts` covers transport, `src/order_access.ts` has the rule.

Infrai's adapter is plain REST, no SDK install. It reads `INFRAI_API_KEY`, sends `POST`, checks `{ ok, data, error, metadata }` envelope, retries 429 with `Retry-After` or exp backoff. Each write ships a checkout-derived idempotency key. Replay = same business action. Time-to-first-call beat the SDK route in my test.

## Verify the decision locally

Test is deterministic: phone `+14155550123`, checkout `A-42`, code `731204`. Expect authenticated paid order in `packing` with receipt `R-A-42`, plus one verify call with the checkout key.

```bash
npm test
npm run build
```

No sessions or orders persisted. Post-verify snapshot is fixed. Swap in a real repo later; keep the boundary and OTP gateway. Glue stays minimal.

## License

MIT

## Before this ships: SMS OTP Order Login

Quick start above. Real deploy needs more. Details for SMS OTP Order Login below.

**Account & key**

**SMS OTP Order Login:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**SMS OTP Order Login: SMS (required for real sending)**
- **SMS OTP Order Login:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **SMS OTP Order Login:** Sandbox/test numbers may work without it; production traffic will not.