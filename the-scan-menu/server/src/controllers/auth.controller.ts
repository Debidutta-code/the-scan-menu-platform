import { Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository';
import { restaurantStaffRepository } from '../repositories/restaurantStaff.repository';
import { restaurantRepository } from '../repositories/restaurant.repository';
import { featureFlagRepository } from '../repositories/featureFlag.repository';
import { TokenService } from '../services/token.service';
import { sendSuccess, sendError } from '../utils/response';
import config from '../config';

export class AuthController {
  private userRepository = new UserRepository();
  private tokenRepository = new RefreshTokenRepository();
  private tokenService = new TokenService();

  constructor() {
    this.login = this.login.bind(this);
    this.refresh = this.refresh.bind(this);
    this.logout = this.logout.bind(this);
    this.me = this.me.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.changePassword = this.changePassword.bind(this);
  }

  async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();

      const user = await this.userRepository.findByEmail(cleanEmail);
      if (!user) {
        sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', null, 401);
        return;
      }

      if (!user.isActive) {
        sendError(res, 'USER_INACTIVE', 'User account is deactivated', null, 401);
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', null, 401);
        return;
      }

      const clientType = req.body?.clientType || (req.headers['x-client-type'] as string) || 'web';
      const payload = { id: user.id, email: user.email, role: user.role };
      const accessToken = this.tokenService.generateAccessToken(payload);

      const refreshTokenStr = this.tokenService.generateRefreshTokenString();
      const tokenHash = this.tokenService.hashToken(refreshTokenStr);
      const expiresAt = this.tokenService.getRefreshTokenExpiry(clientType);
      const expiryDays = this.tokenService.getRefreshTokenExpiryDays(clientType);

      await this.tokenRepository.create(user.id, tokenHash, expiresAt);

      const isProd = config.app.isProduction;
      res.cookie('refreshToken', refreshTokenStr, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'strict',
        path: '/api/v1/auth',
        maxAge: expiryDays * 24 * 60 * 60 * 1000,
      });

      const staffRecords = await restaurantStaffRepository.findByUserId(user.id);
      let assignedRestaurants = staffRecords.filter(s => s.isActive).map((s) => s.restaurantId.toString());

      if (user.role === 'SUPER_ADMIN' && assignedRestaurants.length === 0) {
        const allRestaurants = await restaurantRepository.findAll({ status: { $ne: 'ARCHIVED' } });
        assignedRestaurants = allRestaurants.map((r: any) => r.id.toString());
      }

      // Check Mobile Application Feature Flag when logging in from mobile client
      if (clientType === 'mobile' && user.role !== 'SUPER_ADMIN') {
        let hasMobileAccess = false;

        if (assignedRestaurants.length > 0) {
          for (const restId of assignedRestaurants) {
            const enabledFlag = await featureFlagRepository.findByKey(restId, 'mobile_app');
            if (enabledFlag && enabledFlag.enabled) {
              hasMobileAccess = true;
              break;
            }
          }
        }

        if (!hasMobileAccess) {
          sendError(
            res,
            'MOBILE_APP_DISABLED',
            'Mobile application access is disabled for your restaurant. Please reach out to hello@pixorastudios.com or +91 6371875968 for help.',
            {
              supportEmail: 'hello@pixorastudios.com',
              supportPhone: '+91 6371875968',
              feature: 'mobile_app',
            },
            403
          );
          return;
        }
      }

      sendSuccess(
        res,
        {
          accessToken,
          refreshToken: refreshTokenStr,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
            restaurants: assignedRestaurants,
          },
        },
        'Login successful'
      );
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshTokenStr = req.body?.refreshToken || req.cookies?.refreshToken;
      if (!refreshTokenStr) {
        sendError(res, 'MISSING_REFRESH_TOKEN', 'Refresh token is missing', null, 401);
        return;
      }

      const tokenHash = this.tokenService.hashToken(refreshTokenStr);
      const tokenDoc = await this.tokenRepository.findByHash(tokenHash);

      if (!tokenDoc) {
        sendError(res, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or revoked', null, 401);
        return;
      }

      if (tokenDoc.expiresAt < new Date()) {
        sendError(res, 'EXPIRED_REFRESH_TOKEN', 'Refresh token has expired', null, 401);
        return;
      }

      const user = await this.userRepository.findById(tokenDoc.userId.toString());
      if (!user || !user.isActive) {
        sendError(res, 'UNAUTHORIZED', 'Associated user is invalid or deactivated', null, 401);
        return;
      }

      // Token rotation
      await this.tokenRepository.revoke(tokenHash);

      const clientType = req.body?.clientType || (req.headers['x-client-type'] as string) || 'web';
      const payload = { id: user.id, email: user.email, role: user.role };
      const newAccessToken = this.tokenService.generateAccessToken(payload);

      const newRefreshTokenStr = this.tokenService.generateRefreshTokenString();
      const newRefreshTokenHash = this.tokenService.hashToken(newRefreshTokenStr);
      const expiresAt = this.tokenService.getRefreshTokenExpiry(clientType);
      const expiryDays = this.tokenService.getRefreshTokenExpiryDays(clientType);

      await this.tokenRepository.create(user.id, newRefreshTokenHash, expiresAt);

      const isProd = config.app.isProduction;
      res.cookie('refreshToken', newRefreshTokenStr, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'strict',
        path: '/api/v1/auth',
        maxAge: expiryDays * 24 * 60 * 60 * 1000,
      });

      sendSuccess(
        res,
        {
          accessToken: newAccessToken,
          refreshToken: newRefreshTokenStr,
        },
        'Token refreshed successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshTokenStr = req.body?.refreshToken || req.cookies?.refreshToken;
      if (refreshTokenStr) {
        const tokenHash = this.tokenService.hashToken(refreshTokenStr);
        await this.tokenRepository.revoke(tokenHash);
      }

      const isProd = config.app.isProduction;
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'strict',
        path: '/api/v1/auth',
      });

      sendSuccess(res, {}, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'UNAUTHORIZED', 'Not authenticated', null, 401);
        return;
      }

      const user = await this.userRepository.findById(req.user.id);
      if (!user) {
        sendError(res, 'NOT_FOUND', 'User not found', null, 404);
        return;
      }

      const staffRecords = await restaurantStaffRepository.findByUserId(user.id);
      let assignedRestaurants = staffRecords.filter(s => s.isActive).map((s) => s.restaurantId.toString());

      if (user.role === 'SUPER_ADMIN' && assignedRestaurants.length === 0) {
        const allRestaurants = await restaurantRepository.findAll({ status: { $ne: 'ARCHIVED' } });
        assignedRestaurants = allRestaurants.map((r: any) => r.id.toString());
      }

      sendSuccess(
        res,
        {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
            restaurants: assignedRestaurants,
          },
        },
        'User details fetched successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'UNAUTHORIZED', 'Not authenticated', null, 401);
        return;
      }

      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length < 1) {
        sendError(res, 'VALIDATION_ERROR', 'Name is required', null, 400);
        return;
      }

      const user = await this.userRepository.update(req.user.id, { name: name.trim() });
      if (!user) {
        sendError(res, 'NOT_FOUND', 'User not found', null, 404);
        return;
      }

      sendSuccess(res, { id: user.id, name: user.name, email: user.email, role: user.role }, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'UNAUTHORIZED', 'Not authenticated', null, 401);
        return;
      }

      const { currentPassword, newPassword } = req.body;

      const user = await this.userRepository.findById(req.user.id);
      if (!user) {
        sendError(res, 'NOT_FOUND', 'User not found', null, 404);
        return;
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        sendError(res, 'INVALID_CURRENT_PASSWORD', 'The current password provided is incorrect', null, 400);
        return;
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await this.userRepository.update(user.id, { passwordHash: newPasswordHash });

      // Revoke all refresh tokens on password change to force login on other devices
      await this.tokenRepository.revokeAllForUser(user.id);

      sendSuccess(res, {}, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
}
export default AuthController;
