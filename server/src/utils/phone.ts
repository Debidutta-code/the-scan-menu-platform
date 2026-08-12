import { CustomError } from './response';

/**
 * Normalizes an Indian mobile phone number into canonical E.164 format: +91XXXXXXXXXX.
 * Accepts formats:
 * - 9876543210
 * - 09876543210
 * - 919876543210
 * - +919876543210
 * - +91 98765 43210
 * - +91-98765-43210
 * 
 * Valid Indian mobile numbers must have exactly 10 digits starting with [6-9].
 */
export function normalizeIndianPhoneNumber(rawPhone: string): string {
  if (!rawPhone || typeof rawPhone !== 'string') {
    throw new CustomError('INVALID_PHONE_NUMBER', 'A valid phone number is required', 400);
  }

  // Strip all non-digit characters except leading plus if any
  const cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');

  // Extract pure digits
  let digits = cleaned;
  if (digits.startsWith('+')) {
    digits = digits.substring(1);
  }

  // Handle leading 0 (e.g. 09876543210 -> 11 digits)
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.substring(1);
  }

  // Handle leading country code 91 (e.g. 919876543210 -> 12 digits)
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.substring(2);
  }

  // We should now have exactly 10 digits
  if (digits.length !== 10) {
    throw new CustomError(
      'INVALID_PHONE_NUMBER',
      'Please enter a valid 10-digit Indian mobile number',
      400
    );
  }

  // Indian mobile numbers must start with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(digits)) {
    throw new CustomError(
      'INVALID_PHONE_NUMBER',
      'Invalid Indian mobile number. Mobile numbers must start with 6, 7, 8, or 9',
      400
    );
  }

  return `+91${digits}`;
}

/**
 * Validates whether a phone number can be normalized as an Indian mobile number.
 */
export function isValidIndianPhoneNumber(rawPhone: string): boolean {
  try {
    normalizeIndianPhoneNumber(rawPhone);
    return true;
  } catch {
    return false;
  }
}
