import { RestaurantSettings, IRestaurantSettingsWhiteLabel } from '../models/RestaurantSettings';
import { Restaurant } from '../models/Restaurant';
import { WhiteLabelConfigInput } from '../validators/whiteLabel.validator';
import { Types } from 'mongoose';

export class WhiteLabelService {
  /**
   * Get White Label configuration for a restaurant.
   */
  async getWhiteLabelConfig(restaurantId: string): Promise<IRestaurantSettingsWhiteLabel> {
    const settings = await RestaurantSettings.findOne({ restaurantId: new Types.ObjectId(restaurantId) });
    return settings?.whiteLabelConfig || {
      enabled: false,
      hidePoweredBy: false,
    };
  }

  /**
   * Update White Label configuration for a restaurant.
   */
  async updateWhiteLabelConfig(
    restaurantId: string,
    input: WhiteLabelConfigInput
  ): Promise<IRestaurantSettingsWhiteLabel> {
    const rId = new Types.ObjectId(restaurantId);

    // If customDomain is specified, ensure it is unique across tenants
    if (input.customDomain && input.customDomain.trim() !== '') {
      const normalizedDomain = input.customDomain.trim().toLowerCase();
      const existing = await RestaurantSettings.findOne({
        'whiteLabelConfig.customDomain': normalizedDomain,
        restaurantId: { $ne: rId },
      });

      if (existing) {
        throw new Error('CUSTOM_DOMAIN_TAKEN');
      }
    }

    const settings = await RestaurantSettings.findOne({ restaurantId: rId });
    if (!settings) {
      throw new Error('RESTAURANT_SETTINGS_NOT_FOUND');
    }

    const currentConfig = settings.whiteLabelConfig || { enabled: false, hidePoweredBy: false };

    const updatedConfig: IRestaurantSettingsWhiteLabel = {
      enabled: input.enabled !== undefined ? input.enabled : currentConfig.enabled,
      customDomain: input.customDomain !== undefined ? (input.customDomain.trim() || undefined) : currentConfig.customDomain,
      logoUrl: input.logoUrl !== undefined ? (input.logoUrl.trim() || undefined) : currentConfig.logoUrl,
      faviconUrl: input.faviconUrl !== undefined ? (input.faviconUrl.trim() || undefined) : currentConfig.faviconUrl,
      primaryColor: input.primaryColor !== undefined ? (input.primaryColor.trim() || undefined) : currentConfig.primaryColor,
      secondaryColor: input.secondaryColor !== undefined ? (input.secondaryColor.trim() || undefined) : currentConfig.secondaryColor,
      backgroundColor: input.backgroundColor !== undefined ? (input.backgroundColor.trim() || undefined) : currentConfig.backgroundColor,
      textColor: input.textColor !== undefined ? (input.textColor.trim() || undefined) : currentConfig.textColor,
      fontFamily: input.fontFamily !== undefined ? (input.fontFamily.trim() || undefined) : currentConfig.fontFamily,
      hidePoweredBy: input.hidePoweredBy !== undefined ? input.hidePoweredBy : currentConfig.hidePoweredBy,
      customCss: input.customCss !== undefined ? (input.customCss.trim() || undefined) : currentConfig.customCss,
    };

    settings.whiteLabelConfig = updatedConfig;
    await settings.save();

    return updatedConfig;
  }

  /**
   * Resolve public tenant & theme by custom domain name.
   */
  async getByCustomDomain(domain: string): Promise<{
    restaurant: {
      id: string;
      name: string;
      slug: string;
      currency: string;
    };
    whiteLabel: IRestaurantSettingsWhiteLabel;
  } | null> {
    const normalizedDomain = domain.trim().toLowerCase();
    const settings = await RestaurantSettings.findOne({
      'whiteLabelConfig.customDomain': normalizedDomain,
      'whiteLabelConfig.enabled': true,
    });

    if (!settings) {
      return null;
    }

    const restaurant = await Restaurant.findById(settings.restaurantId);
    if (!restaurant || restaurant.status !== 'ACTIVE') {
      return null;
    }

    return {
      restaurant: {
        id: restaurant._id.toString(),
        name: restaurant.name,
        slug: restaurant.slug,
        currency: restaurant.currency || settings.currency || 'INR',
      },
      whiteLabel: settings.whiteLabelConfig!,
    };
  }
}

export const whiteLabelService = new WhiteLabelService();
export default whiteLabelService;
