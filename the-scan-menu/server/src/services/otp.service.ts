import { Types } from 'mongoose';
import crypto from 'crypto';
import { OtpSession } from '../models/OtpSession';
import { normalizeIndianPhoneNumber } from '../utils/phone';
import { CustomError } from '../utils/response';
import config from '../config';

export class OtpService {
  /**
   * Hashes an OTP code using SHA-256.
   */
  private hashOtp(code: string): string {
    return crypto.createHash('sha256').update(code.trim()).digest('hex');
  }

  /**
   * Generates a 4-digit numeric OTP code.
   * NOTE: Currently returns '0000' as a placeholder until SMS gateway is integrated.
   */
  private generate4DigitOtp(): string {
    return '0000';
  }

  /**
   * Initiates OTP generation and persistence with resend cooldown and TTL.
   * Currently uses '0000' as a fixed 4-digit placeholder until SMS gateway is integrated.
   */
  async sendOtp(
    restaurantId: Types.ObjectId | string,
    rawPhone: string
  ): Promise<{
    phone: string;
    cooldownSeconds: number;
    demoOtp?: string;
  }> {
    const normalizedPhone = normalizeIndianPhoneNumber(rawPhone);
    const rId = new Types.ObjectId(restaurantId);

    // 1. Check for active cooldown on existing unused OTP
    const existingSession = await OtpSession.findOne({
      restaurantId: rId,
      phone: normalizedPhone,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (existingSession && existingSession.resendAvailableAt > new Date()) {
      const remainingSeconds = Math.ceil(
        (existingSession.resendAvailableAt.getTime() - Date.now()) / 1000
      );
      throw new CustomError(
        'OTP_COOLDOWN',
        `Please wait ${remainingSeconds} seconds before requesting another verification code`,
        429,
        { retryAfterSeconds: remainingSeconds }
      );
    }

    // 2. Invalidate / mark superseded any previous unused OTP sessions for this phone
    if (existingSession) {
      existingSession.isUsed = true;
      await existingSession.save();
    }

    // 3. Generate 4-digit OTP (fixed '0000' placeholder until SMS gateway is integrated)
    const otpCode = this.generate4DigitOtp();
    const otpHash = this.hashOtp(otpCode);

    // 4. Save new OTP Session with 5-minute TTL & 60s cooldown
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
    const resendAvailableAt = new Date(now.getTime() + 60 * 1000); // 60 seconds

    const newSession = new OtpSession({
      restaurantId: rId,
      phone: normalizedPhone,
      otpHash,
      attempts: 0,
      maxAttempts: 5,
      resendAvailableAt,
      expiresAt,
      isUsed: false,
    });

    await newSession.save();

    // 5. In test and non-production environments, provide demoOtp for automated testing
    const isNonProduction = config.app.isTest || process.env.NODE_ENV !== 'production';
    const demoOtp = isNonProduction ? otpCode : undefined;

    return {
      phone: normalizedPhone,
      cooldownSeconds: 60,
      demoOtp,
    };
  }

  /**
   * Verifies a 4-digit PIN against the active session.
   * Enforces attempt limits, timing-safe hash comparison, and single-use invalidation.
   */
  async verifyOtp(
    restaurantId: Types.ObjectId | string,
    rawPhone: string,
    code: string
  ): Promise<{
    verified: boolean;
    phone: string;
  }> {
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      throw new CustomError('BAD_REQUEST', 'Verification code is required', 400);
    }

    const normalizedPhone = normalizeIndianPhoneNumber(rawPhone);
    const rId = new Types.ObjectId(restaurantId);

    // Find the latest active, non-expired, unused OTP session
    const session = await OtpSession.findOne({
      restaurantId: rId,
      phone: normalizedPhone,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!session) {
      throw new CustomError(
        'INVALID_OR_EXPIRED_OTP',
        'Verification code has expired or is invalid. Please request a new one.',
        400
      );
    }

    // Check if maximum attempts have already been exhausted
    if (session.attempts >= session.maxAttempts) {
      session.isUsed = true;
      await session.save();
      throw new CustomError(
        'OTP_MAX_ATTEMPTS_EXCEEDED',
        'Maximum verification attempts exceeded. Please request a new code.',
        400
      );
    }

    // Timing-safe constant-time hash comparison
    const inputHash = this.hashOtp(code);
    const isMatch =
      inputHash.length === session.otpHash.length &&
      crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(session.otpHash));

    if (!isMatch) {
      session.attempts += 1;
      const remainingAttempts = Math.max(0, session.maxAttempts - session.attempts);

      if (remainingAttempts === 0) {
        session.isUsed = true;
      }
      await session.save();

      if (remainingAttempts === 0) {
        throw new CustomError(
          'OTP_MAX_ATTEMPTS_EXCEEDED',
          'Maximum verification attempts exceeded. Please request a new code.',
          400
        );
      }

      throw new CustomError(
        'INVALID_OTP',
        `Incorrect verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
        400,
        { remainingAttempts }
      );
    }

    // Success: Mark as used immediately (single-use)
    session.isUsed = true;
    await session.save();

    return {
      verified: true,
      phone: normalizedPhone,
    };
  }
}

export const otpService = new OtpService();
export default otpService;
