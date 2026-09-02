import { ClientSession } from 'mongoose';
import { PlatformSettings, IPlatformSettings } from '../models/PlatformSettings';

export class PlatformSettingsRepository {
  async getSettings(session?: ClientSession): Promise<IPlatformSettings> {
    let settings = await PlatformSettings.findOne({}, null, { session });
    if (!settings) {
      const created = await PlatformSettings.create([{}], { session });
      settings = created[0];
    }
    return settings;
  }

  async updateSettings(data: Partial<IPlatformSettings>, session?: ClientSession): Promise<IPlatformSettings> {
    let settings = await PlatformSettings.findOne({}, null, { session });
    if (!settings) {
      const created = await PlatformSettings.create([data], { session });
      return created[0];
    }
    return PlatformSettings.findOneAndUpdate({}, { $set: data }, { new: true, session }) as Promise<IPlatformSettings>;
  }
}

export const platformSettingsRepository = new PlatformSettingsRepository();
