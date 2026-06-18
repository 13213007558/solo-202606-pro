import { Planet, ResourceType } from './planet';

export interface TradeRouteConfig {
  id: string;
  from: Planet;
  to: Planet;
  resourceType: ResourceType;
  amount: number;
  capacity: number;
  baseTravelTimeMs: number;
}

interface CargoPacket {
  id: number;
  direction: 'forward' | 'backward';
  resourceType: ResourceType;
  amount: number;
  progress: number;
}

let packetIdCounter = 0;

export class TradeRoute {
  public readonly id: string;
  public from: Planet;
  public to: Planet;
  public resourceType: ResourceType;
  public amount: number;
  public capacity: number;
  public baseTravelTimeMs: number;
  public speedMultiplier: number = 1;
  public capacityMultiplier: number = 1;
  public routeEfficiency: number = 1;
  public activeEvents: Set<string> = new Set();

  private cargo: CargoPacket[] = [];
  private sendCooldownMs: number = 800;
  private lastSendTime: number = 0;
  public totalTradedCredits: number = 0;

  constructor(config: TradeRouteConfig) {
    this.id = config.id;
    this.from = config.from;
    this.to = config.to;
    this.resourceType = config.resourceType;
    this.amount = config.amount;
    this.capacity = config.capacity;
    this.baseTravelTimeMs = config.baseTravelTimeMs;
  }

  get effectiveCapacity(): number {
    return Math.floor(this.capacity * this.capacityMultiplier * this.routeEfficiency);
  }

  get effectiveTravelTimeMs(): number {
    return this.baseTravelTimeMs / (this.speedMultiplier * this.routeEfficiency);
  }

  get activeCargoCount(): number {
    return this.cargo.length;
  }

  update(currentTimeMs: number, deltaMs: number, onDelivered?: (credits: number) => void): void {
    const travelTime = this.effectiveTravelTimeMs;

    for (let i = this.cargo.length - 1; i >= 0; i--) {
      const packet = this.cargo[i];
      packet.progress += (deltaMs / travelTime) * 100;
      if (packet.progress >= 100) {
        const target = packet.direction === 'forward' ? this.to : this.from;
        const source = packet.direction === 'forward' ? this.from : this.to;
        const delivered = target.addResource(packet.resourceType, packet.amount);

        const baseValue = this.getResourceValue(packet.resourceType);
        const credits = Math.floor(delivered * baseValue * 0.8);
        this.totalTradedCredits += credits;
        if (onDelivered && credits > 0) onDelivered(credits);

        void source;
        this.cargo.splice(i, 1);
      }
    }

    if (currentTimeMs - this.lastSendTime >= this.sendCooldownMs) {
      if (this.cargo.length < this.effectiveCapacity) {
        this.trySendPacket('forward');
      }
      this.lastSendTime = currentTimeMs;
    }
  }

  private trySendPacket(direction: 'forward' | 'backward'): void {
    const source = direction === 'forward' ? this.from : this.to;
    const sendAmount = Math.min(
      this.amount,
      Math.floor(source.resources[this.resourceType] * 0.15),
      Math.floor(source.storageCapacity * 0.05)
    );
    if (sendAmount <= 0) return;
    if (!source.hasResource(this.resourceType, sendAmount)) return;

    source.removeResource(this.resourceType, sendAmount);
    packetIdCounter++;
    this.cargo.push({
      id: packetIdCounter,
      direction,
      resourceType: this.resourceType,
      amount: sendAmount,
      progress: 0
    });
  }

  getCargoProgressList(): { progress: number; direction: 'forward' | 'backward'; resourceType: ResourceType; amount: number }[] {
    return this.cargo.map(p => ({
      progress: p.progress,
      direction: p.direction,
      resourceType: p.resourceType,
      amount: p.amount
    }));
  }

  adjustCapacity(newCapacity: number): void {
    this.capacity = Math.max(1, newCapacity);
  }

  applyEvent(eventId: string, speedMod: number, capMod: number, durationMs: number, onExpire?: () => void): void {
    this.activeEvents.add(eventId);
    this.speedMultiplier *= speedMod;
    this.capacityMultiplier *= capMod;
    setTimeout(() => {
      this.activeEvents.delete(eventId);
      this.speedMultiplier /= speedMod;
      this.capacityMultiplier /= capMod;
      if (onExpire) onExpire();
    }, durationMs);
  }

  private getResourceValue(type: ResourceType): number {
    switch (type) {
      case 'metal': return 5;
      case 'energy': return 3;
      case 'food': return 2;
    }
  }
}
