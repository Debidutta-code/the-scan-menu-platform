import {
  Payment,
  IPayment,
  PaymentProviderType,
  PaymentMethodType,
  PaymentMode,
  PaymentStatus,
} from './Payment';

export {
  Payment,
  IPayment,
  PaymentProviderType,
  PaymentMethodType,
  PaymentMode,
  PaymentStatus,
};

export const Transaction = Payment;
export type ITransaction = IPayment;
export type TransactionStatus = PaymentStatus;
export default Payment;
