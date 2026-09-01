import { PaymentProvider } from './PaymentProvider';
import { CashAdapter } from './adapters/CashAdapter';
import { RazorpayAdapter } from './adapters/RazorpayAdapter';

export class PaymentProviderFactory {
  public static getAdapter(providerName?: string): PaymentProvider {
    const name = (providerName || '').toUpperCase().trim();
    switch (name) {
      case 'RAZORPAY':
        return new RazorpayAdapter();
      case 'STRIPE':
        throw new Error('Stripe adapter not configured for this region');
      case 'SQUARE':
        throw new Error('Square adapter not configured for this region');
      case 'CASH':
      default:
        return new CashAdapter();
    }
  }
}
export default PaymentProviderFactory;
