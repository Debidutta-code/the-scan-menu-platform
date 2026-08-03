import { RestaurantIntegration } from './RestaurantIntegration';
import { NoOpIntegration } from '../adapters/NoOpIntegration';
import { PetpoojaIntegration } from '../adapters/PetpoojaIntegration';
import { FutureRistaIntegration } from '../adapters/FutureRistaIntegration';
import { FutureUrbanPiperIntegration } from '../adapters/FutureUrbanPiperIntegration';

export class IntegrationFactory {
  public static getAdapter(providerName?: string): RestaurantIntegration {
    const name = (providerName || '').toUpperCase().trim();
    switch (name) {
      case 'PETPOOJA':
        return new PetpoojaIntegration();
      case 'RISTA':
        return new FutureRistaIntegration();
      case 'URBANPIPER':
        return new FutureUrbanPiperIntegration();
      case 'NONE':
      default:
        return new NoOpIntegration();
    }
  }
}
export default IntegrationFactory;
