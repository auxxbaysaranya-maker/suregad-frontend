import { api } from "./api";

export interface GatewayPayment {
  gatewayOrderId: string;
  keyId?: string;
  amountPaise: number;
  provider?: string;
}

/**
 * Complete a gateway order: Razorpay Checkout in production, or the dev-only mock completion.
 * The server verifies the signature before anything is marked paid.
 */
export async function settlePayment(payment: GatewayPayment, mock: boolean) {
  if (mock || !payment.keyId) {
    await api.post("/payments/mock-complete", { gatewayOrderId: payment.gatewayOrderId });
    return;
  }
  await loadRazorpay();
  await new Promise<void>((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Razorpay Checkout did not load."));
      return;
    }
    const checkout = new window.Razorpay({
      key: payment.keyId,
      amount: payment.amountPaise,
      currency: "INR",
      order_id: payment.gatewayOrderId,
      theme: { color: "#3a3fe0" },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        try {
          await api.post("/payments/verify", {
            gatewayOrderId: response.razorpay_order_id,
            gatewayPaymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      modal: { ondismiss: () => reject(new Error("Payment was closed before confirmation.")) },
    });
    checkout.open();
  });
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    document.body.appendChild(script);
  });
}
