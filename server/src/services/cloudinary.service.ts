import { v2 as cloudinary } from 'cloudinary';
import config from '../config';

export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });
  }

  /**
   * Generates a signed upload signature for direct-to-Cloudinary uploads
   */
  generateUploadSignature(restaurantId: string): {
    signature: string;
    timestamp: number;
    folder: string;
    apiKey: string;
    cloudName: string;
  } {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = `pixora-qr/${restaurantId}/menu`;

    const paramsToSign = {
      timestamp,
      folder,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      config.cloudinary.apiSecret
    );

    return {
      signature,
      timestamp,
      folder,
      apiKey: config.cloudinary.apiKey,
      cloudName: config.cloudinary.cloudName,
    };
  }
}

export default CloudinaryService;
