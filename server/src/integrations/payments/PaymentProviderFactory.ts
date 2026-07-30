import { PaymentProvider } from './PaymentProvider';
import { CashAdapter } from './adapters/CashAdapter';

export class PaymentProviderFactory {
  public static getAdapter(providerName?: string): PaymentProvider {
    const name = (providerName || '').toUpperCase().trim();
    switch (name) {
      case 'RAZORPAY':
        throw new Error('Razorpay adapter not implemented in Phase 6');
      case 'STRIPE':
        throw new Error('Stripe adapter not implemented in Phase 6');
      case 'SQUARE':
        throw new Error('Square adapter not implemented in Phase 6');
      case 'CASH':
      default:
        return new CashAdapter();
    }
  }
}
export default PaymentProviderFactory;
