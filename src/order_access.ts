import { z } from "zod";
import { infrai } from "./infrai_sms.js";

export const requestCodeBody = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "phone must use E.164 format"),
  checkoutId: z.string().min(1).max(80),
}).strict();

export const verifyCodeBody = requestCodeBody.extend({
  code: z.string().regex(/^\d{4,8}$/),
}).strict();

export type OrderSnapshot = {
  checkoutId: string;
  checkout: "paid";
  fulfillment: "packing" | "shipped";
  receipt: { number: string; available: true };
  customerUpdate: string;
};

export type OtpGateway = {
  send(phone: string, requestKey: string): Promise<unknown>;
  verify(phone: string, code: string, requestKey: string): Promise<unknown>;
};

export const smsOtpGateway: OtpGateway = {
  send: (phone, requestKey) => infrai.sms.otp({ to: phone, idempotency_key: requestKey }),
  verify: (phone, code, requestKey) =>
    infrai.sms.verify({ to: phone, code, idempotency_key: requestKey }),
};

export async function requestOrderCode(
  input: z.infer<typeof requestCodeBody>,
  gateway: OtpGateway = smsOtpGateway,
) {
  await gateway.send(input.phone, `checkout:${input.checkoutId}:otp`);
  return { checkoutId: input.checkoutId, codeSent: true as const };
}

export async function verifyOrderAccess(
  input: z.infer<typeof verifyCodeBody>,
  gateway: OtpGateway = smsOtpGateway,
): Promise<{ authenticated: true; order: OrderSnapshot }> {
  await gateway.verify(input.phone, input.code, `checkout:${input.checkoutId}:verify:${input.code}`);

  return {
    authenticated: true,
    order: {
      checkoutId: input.checkoutId,
      checkout: "paid",
      fulfillment: "packing",
      receipt: { number: `R-${input.checkoutId}`, available: true },
      customerUpdate: "Payment received; the order is being packed.",
    },
  };
}
