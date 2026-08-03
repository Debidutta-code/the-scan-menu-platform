import crypto from 'crypto';
import { ApiKey, IApiKey, ApiKeyScope } from '../models/ApiKey';
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

    const apiKey = await ApiKey.create({
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
    const apiKey = await ApiKey.findOne({ keyHash, isActive: true });

    if (!apiKey) {
      return null;
    }

    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return null;
    }

    // Update lastUsedAt asynchronously
    ApiKey.updateOne({ _id: apiKey._id }, { lastUsedAt: new Date() }).exec();

    return apiKey;
  }

  /**
   * List all API keys for a restaurant.
   */
  async listApiKeys(restaurantId: string): Promise<IApiKey[]> {
    return ApiKey.find({ restaurantId: new Types.ObjectId(restaurantId) }).sort({ createdAt: -1 });
  }

  /**
   * Revoke (deactivate) an API key.
   */
  async revokeApiKey(restaurantId: string, keyId: string): Promise<boolean> {
    const res = await ApiKey.updateOne(
      { _id: new Types.ObjectId(keyId), restaurantId: new Types.ObjectId(restaurantId) },
      { isActive: false }
    );
    return res.modifiedCount > 0;
  }
}

export const apiKeyService = new ApiKeyService();
export default apiKeyService;
