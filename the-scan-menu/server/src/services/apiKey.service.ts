import crypto from 'crypto';
import { IApiKey, ApiKeyScope } from '../models/ApiKey';
import { apiKeyRepository } from '../repositories/apiKey.repository';
import { CreateApiKeyInput } from '../validators/apiKey.validator';
import { Types } from 'mongoose';

export class ApiKeyService {
  /**
   * Compute SHA-256 hash of raw API key.
   */
  hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Create a new API Key for a restaurant.
   * Returns the raw key ONLY ONCE upon creation.
   */
  async createApiKey(
    restaurantId: string,
    input: CreateApiKeyInput
  ): Promise<{ apiKey: IApiKey; rawKey: string }> {
    const rId = new Types.ObjectId(restaurantId);
    const randomHex = crypto.randomBytes(24).toString('hex');
    const rawKey = `tsm_live_${randomHex}`;
    const keyPrefix = rawKey.substring(0, 16) + '...';
    const keyHash = this.hashKey(rawKey);

    let expiresAt: Date | undefined;
    if (input.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);
    }

    const apiKey = await apiKeyRepository.create({
      restaurantId: rId,
      name: input.name,
      keyPrefix,
      keyHash,
      scopes: input.scopes as ApiKeyScope[],
      expiresAt,
      isActive: true,
    });

    return { apiKey, rawKey };
  }

  /**
   * Verify an incoming API key string against stored SHA-256 hash.
   */
  async verifyApiKey(rawKey: string): Promise<IApiKey | null> {
    if (!rawKey || !rawKey.startsWith('tsm_live_')) {
      return null;
    }

    const keyHash = this.hashKey(rawKey);
    const apiKey = await apiKeyRepository.findByKeyHash(keyHash);

    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return null;
    }

    // Update lastUsedAt asynchronously
    apiKeyRepository.updateLastUsed(apiKey._id as any).catch(() => {});

    return apiKey;
  }

  /**
   * List all API keys for a restaurant.
   */
  async listApiKeys(restaurantId: string): Promise<IApiKey[]> {
    return apiKeyRepository.findByRestaurantId(restaurantId);
  }

  /**
   * Revoke (deactivate) an API key.
   */
  async revokeApiKey(restaurantId: string, keyId: string): Promise<boolean> {
    const key = await apiKeyRepository.findById(keyId);
    if (key && key.restaurantId.toString() === restaurantId.toString()) {
      key.isActive = false;
      await (key as any).save();
      return true;
    }
    return false;
  }
}

export const apiKeyService = new ApiKeyService();
export default apiKeyService;
