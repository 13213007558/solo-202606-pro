export type ResourceType = 'metal' | 'energy' | 'food';

export interface PlanetConfig {
  id: string;
  name: string;
  x: number;
  y: number;
  initialResources: Partial<Record<ResourceType, number>>;
  productionRates: Partial<Record<ResourceType, number>>;
  storageCapacity: number;
  color: string;
}

export class Planet {
  public readonly id: string;
  public readonly name: string;
  public x: number;
  public y: number;
  public color: string;
  public resources: Record<ResourceType, number>;
  public productionRates: Record<ResourceType, number>;
  public facilityLevels: Record<ResourceType, number>;
  public storageCapacity: number;
  public eventModifiers: Partial<Record<ResourceType, number>>;
  public activeEvents: Set<string>;

  constructor(config: PlanetConfig) {
    this.id = config.id;
    this.name = config.name;
    this.x = config.x;
    this.y = config.y;
    this.color = config.color;
    this.storageCapacity = config.storageCapacity;
    this.eventModifiers = {};
    this.activeEvents = new Set();

    this.resources = { metal: 0, energy: 0, food: 0 };
    this.productionRates = { metal: 0, energy: 0, food: 0 };
    this.facilityLevels = { metal: 1, energy: 1, food: 1 };

    for (const type of ['metal', 'energy', 'food'] as ResourceType[]) {
      this.resources[type] = config.initialResources[type] ?? 0;
      this.productionRates[type] = config.productionRates[type] ?? 0;
    }
  }

  update(deltaSeconds: number, globalProductionMultiplier: number = 1): void {
    for (const type of ['metal', 'energy', 'food'] as ResourceType[]) {
      let rate = this.productionRates[type] * this.facilityLevels[type] * globalProductionMultiplier;
      const modifier = this.eventModifiers[type];
      if (modifier !== undefined) {
        rate *= modifier;
      }
      this.resources[type] = Math.max(0, Math.min(
        this.storageCapacity,
        this.resources[type] + rate * deltaSeconds
      ));
    }
  }

  getUpgradeCost(type: ResourceType): number {
    const level = this.facilityLevels[type];
    return Math.floor(50 * Math.pow(1.6, level - 1));
  }

  upgradeFacility(type: ResourceType, credits: number): { success: boolean; cost: number; credits: number } {
    const cost = this.getUpgradeCost(type);
    if (credits >= cost) {
      this.facilityLevels[type]++;
      return { success: true, cost, credits: credits - cost };
    }
    return { success: false, cost, credits };
  }

  addResource(type: ResourceType, amount: number): number {
    const actual = Math.min(amount, this.storageCapacity - this.resources[type]);
    this.resources[type] += actual;
    return actual;
  }

  removeResource(type: ResourceType, amount: number): number {
    const actual = Math.min(amount, this.resources[type]);
    this.resources[type] -= actual;
    return actual;
  }

  hasResource(type: ResourceType, amount: number): boolean {
    return this.resources[type] >= amount;
  }

  getResourceRatio(type: ResourceType): number {
    return this.storageCapacity > 0 ? this.resources[type] / this.storageCapacity : 0;
  }

  getOverallResourceRatio(): number {
    const total = this.resources.metal + this.resources.energy + this.resources.food;
    const cap = this.storageCapacity * 3;
    return cap > 0 ? total / cap : 0;
  }

  applyEvent(eventId: string, resourceType: ResourceType, modifier: number, durationMs: number, onExpire?: () => void): void {
    this.activeEvents.add(eventId);
    this.eventModifiers[resourceType] = (this.eventModifiers[resourceType] ?? 1) * modifier;
    setTimeout(() => {
      this.activeEvents.delete(eventId);
      this.eventModifiers[resourceType] = (this.eventModifiers[resourceType] ?? 1) / modifier;
      if (onExpire) onExpire();
    }, durationMs);
  }
}
