export interface PaymentIntent {
  transactionId: string;
  providerReferenceId?: string;
  status: 'PENDING' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  clientSecret?: string;
  amount: number;
  currency: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  transactionId?: string;
  status?: 'CAPTURED' | 'FAILED';
  rawPayload?: any;
}

export interface PaymentProvider {
  /**
   * Creates a payment intent. For gateways like Razorpay, this creates a remote order.
   * For Cash, it acts as an immediate ledger entry marked CAPTURED.
   */
  createIntent(
    restaurantId: string,
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentIntent>;

  /**
   * Captures a pending payment intent.
   * For Cash, this is mostly a no-op since createIntent handles capture.
   */
  capture(transactionId: string, amount: number): Promise<boolean>;

  /**
   * Refunds a captured payment.
   */
  refund(transactionId: string, amount: number): Promise<boolean>;

  /**
   * Verifies an incoming webhook from the provider.
   */
  verifyWebhook(payload: any, signature: string): Promise<WebhookVerificationResult>;
}
