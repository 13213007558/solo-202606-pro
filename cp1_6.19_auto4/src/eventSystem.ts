import { Planet, ResourceType } from './planet';
import { TradeRoute } from './tradeRoute';

export type EventSeverity = 'info' | 'warning' | 'danger' | 'success';

export interface GameEvent {
  id: string;
  type: string;
  timestamp: number;
  message: string;
  severity: EventSeverity;
  affectedPlanetId?: string;
  affectedRouteId?: string;
}

export interface TechNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  requires: string[];
  unlocked: boolean;
  effect: TechEffect;
}

export interface TechEffect {
  globalSpeedMultiplier?: number;
  globalCapacityMultiplier?: number;
  globalProductionMultiplier?: number;
  storageCapacityBonus?: number;
  eventChanceReduction?: number;
}

type EventTrigger = (ctx: EventContext) => void;

interface EventContext {
  planets: Planet[];
  routes: TradeRoute[];
  getCredits: () => number;
  addCredits: (n: number) => void;
  pushEvent: (e: GameEvent) => void;
  techEffects: TechEffect;
}

const EVENT_TYPES = [
  { type: 'space_pirate', weight: 28, severity: 'danger' as EventSeverity },
  { type: 'resource_shortage', weight: 22, severity: 'warning' as EventSeverity },
  { type: 'tech_breakthrough', weight: 14, severity: 'success' as EventSeverity },
  { type: 'solar_storm', weight: 18, severity: 'warning' as EventSeverity },
  { type: 'trade_bonus', weight: 18, severity: 'success' as EventSeverity }
];

let eventIdCounter = 0;

export class EventSystem {
  public eventQueue: GameEvent[] = [];
  public readonly maxQueueSize = 50;
  public onEventTriggered?: (event: GameEvent) => void;
  public onWarningStart?: () => void;
  public onWarningEnd?: (eventId: string) => void;

  private nextTriggerMinMs = 12000;
  private nextTriggerMaxMs = 25000;
  private lastTriggerTime = 0;
  private nextTriggerAt = 0;
  private chanceMultiplier = 1;
  private activeWarnings: Map<string, number> = new Map();

  constructor() {
    this.scheduleNext();
  }

  setEventChanceMultiplier(m: number): void {
    this.chanceMultiplier = Math.max(0.1, m);
  }

  private scheduleNext(): void {
    const base = this.nextTriggerMinMs + Math.random() * (this.nextTriggerMaxMs - this.nextTriggerMinMs);
    this.nextTriggerAt = Date.now() + Math.floor(base / this.chanceMultiplier);
  }

  tick(ctx: EventContext): void {
    const now = Date.now();
    if (now - this.lastTriggerTime < 3000) return;
    if (now >= this.nextTriggerAt) {
      this.triggerRandomEvent(ctx);
      this.lastTriggerTime = now;
      this.scheduleNext();
    }
    this.cleanupWarnings(now);
  }

  private cleanupWarnings(now: number): void {
    for (const [id, expireAt] of this.activeWarnings) {
      if (now >= expireAt) {
        this.activeWarnings.delete(id);
        if (this.onWarningEnd) this.onWarningEnd(id);
      }
    }
  }

  triggerRandomEvent(ctx: EventContext): void {
    const totalWeight = EVENT_TYPES.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * totalWeight;
    let selected = EVENT_TYPES[0];
    for (const evt of EVENT_TYPES) {
      roll -= evt.weight;
      if (roll <= 0) { selected = evt; break; }
    }
    this.execEvent(selected.type, selected.severity, ctx);
  }

  private execEvent(type: string, severity: EventSeverity, ctx: EventContext): void {
    const triggerMap: Record<string, EventTrigger> = {
      space_pirate: this.onSpacePirate,
      resource_shortage: this.onResourceShortage,
      tech_breakthrough: this.onTechBreakthrough,
      solar_storm: this.onSolarStorm,
      trade_bonus: this.onTradeBonus
    };
    const fn = triggerMap[type];
    if (fn) fn.call(this, ctx);
    else this.push({ type, severity, message: `未知事件: ${type}`, ctx });
  }

  private onSpacePirate(ctx: EventContext): void {
    if (ctx.routes.length === 0) return;
    const route = ctx.routes[Math.floor(Math.random() * ctx.routes.length)];
    const id = `evt_${++eventIdCounter}`;
    const duration = 15000;
    route.applyEvent(id, 0.4, 0.5, duration);
    this.push({
      type: 'space_pirate',
      severity: 'danger',
      message: `星际海盗袭击路线 ${route.from.name}→${route.to.name}，运输效率大幅降低！`,
      affectedRouteId: route.id,
      ctx
    });
    this.startWarning(id, duration);
  }

  private onResourceShortage(ctx: EventContext): void {
    if (ctx.planets.length === 0) return;
    const planet = ctx.planets[Math.floor(Math.random() * ctx.planets.length)];
    const types: ResourceType[] = ['metal', 'energy', 'food'];
    const t = types[Math.floor(Math.random() * types.length)];
    const id = `evt_${++eventIdCounter}`;
    const duration = 20000;
    planet.applyEvent(id, t, 0.3, duration);
    const typeNames: Record<ResourceType, string> = { metal: '金属', energy: '能源', food: '食物' };
    this.push({
      type: 'resource_shortage',
      severity: 'warning',
      message: `星球 ${planet.name} 遭遇${typeNames[t]}短缺，产量骤降！`,
      affectedPlanetId: planet.id,
      ctx
    });
    this.startWarning(id, duration);
  }

  private onTechBreakthrough(ctx: EventContext): void {
    const bonus = 120 + Math.floor(Math.random() * 240);
    ctx.addCredits(bonus);
    this.push({
      type: 'tech_breakthrough',
      severity: 'success',
      message: `科技突破！获得 ${bonus} 信用点贸易利润。`,
      ctx
    });
  }

  private onSolarStorm(ctx: EventContext): void {
    const affected: TradeRoute[] = [];
    for (const route of ctx.routes) {
      if (Math.random() < 0.5) {
        const id = `evt_${++eventIdCounter}`;
        const duration = 12000;
        route.applyEvent(id, 0.6, 0.75, duration);
        affected.push(route);
        this.startWarning(id, duration);
      }
    }
    if (affected.length > 0) {
      this.push({
        type: 'solar_storm',
        severity: 'warning',
        message: `太阳风暴波及 ${affected.length} 条贸易路线，运输效率下降！`,
        ctx
      });
    } else {
      this.push({
        type: 'solar_storm',
        severity: 'info',
        message: `太阳风暴掠过，但没有贸易路线受影响。`,
        ctx
      });
    }
  }

  private onTradeBonus(ctx: EventContext): void {
    const target = ctx.planets.length > 0
      ? ctx.planets[Math.floor(Math.random() * ctx.planets.length)]
      : null;
    const bonus = 180 + Math.floor(Math.random() * 360);
    ctx.addCredits(bonus);
    const extra = target ? `（来自 ${target.name}）` : '';
    this.push({
      type: 'trade_bonus',
      severity: 'success',
      message: `贸易旺季红利！获得 ${bonus} 信用点${extra}。`,
      affectedPlanetId: target?.id,
      ctx
    });
  }

  private startWarning(id: string, duration: number): void {
    this.activeWarnings.set(id, Date.now() + duration);
    if (this.onWarningStart) this.onWarningStart();
  }

  private push(opts: {
    type: string;
    severity: EventSeverity;
    message: string;
    affectedPlanetId?: string;
    affectedRouteId?: string;
    ctx: EventContext;
  }): void {
    eventIdCounter++;
    const e: GameEvent = {
      id: `evt_${eventIdCounter}`,
      type: opts.type,
      timestamp: Date.now(),
      severity: opts.severity,
      message: opts.message,
      affectedPlanetId: opts.affectedPlanetId,
      affectedRouteId: opts.affectedRouteId
    };
    this.eventQueue.unshift(e);
    if (this.eventQueue.length > this.maxQueueSize) this.eventQueue.length = this.maxQueueSize;
    opts.ctx.pushEvent(e);
    if (this.onEventTriggered) this.onEventTriggered(e);
  }

  hasActiveWarnings(): boolean {
    return this.activeWarnings.size > 0;
  }
}

export class TechTree {
  public nodes: TechNode[];
  public onUnlocked?: (node: TechNode) => void;

  constructor() {
    this.nodes = this.buildTree();
  }

  private buildTree(): TechNode[] {
    return [
      {
        id: 'tech_1',
        name: '量子通讯',
        description: '贸易运输速度 +25%',
        cost: 400,
        requires: [],
        unlocked: false,
        effect: { globalSpeedMultiplier: 1.25 }
      },
      {
        id: 'tech_2',
        name: '高效仓储',
        description: '所有星球存储容量 +50%',
        cost: 600,
        requires: [],
        unlocked: false,
        effect: { storageCapacityBonus: 0.5 }
      },
      {
        id: 'tech_3',
        name: '反重力引擎',
        description: '运输速度再 +30%，容量 +20%',
        cost: 1200,
        requires: ['tech_1'],
        unlocked: false,
        effect: { globalSpeedMultiplier: 1.3, globalCapacityMultiplier: 1.2 }
      },
      {
        id: 'tech_4',
        name: '自动化生产',
        description: '所有资源产量 +40%',
        cost: 1500,
        requires: ['tech_2'],
        unlocked: false,
        effect: { globalProductionMultiplier: 1.4 }
      },
      {
        id: 'tech_5',
        name: '护盾矩阵',
        description: '负面事件触发概率 -40%',
        cost: 2200,
        requires: ['tech_3', 'tech_4'],
        unlocked: false,
        effect: { eventChanceReduction: 0.4 }
      },
      {
        id: 'tech_6',
        name: '星际联合',
        description: '全局产量 +50%，速度 +40%',
        cost: 3500,
        requires: ['tech_5'],
        unlocked: false,
        effect: { globalProductionMultiplier: 1.5, globalSpeedMultiplier: 1.4 }
      }
    ];
  }

  getCumulativeEffects(): TechEffect {
    const eff: Required<TechEffect> = {
      globalSpeedMultiplier: 1,
      globalCapacityMultiplier: 1,
      globalProductionMultiplier: 1,
      storageCapacityBonus: 0,
      eventChanceReduction: 0
    };
    for (const n of this.nodes) {
      if (!n.unlocked) continue;
      const e = n.effect;
      if (e.globalSpeedMultiplier) eff.globalSpeedMultiplier *= e.globalSpeedMultiplier;
      if (e.globalCapacityMultiplier) eff.globalCapacityMultiplier *= e.globalCapacityMultiplier;
      if (e.globalProductionMultiplier) eff.globalProductionMultiplier *= e.globalProductionMultiplier;
      if (e.storageCapacityBonus) eff.storageCapacityBonus += e.storageCapacityBonus;
      if (e.eventChanceReduction) eff.eventChanceReduction += e.eventChanceReduction;
    }
    eff.eventChanceReduction = Math.min(0.8, eff.eventChanceReduction);
    return eff;
  }

  canUnlock(nodeId: string, credits: number): boolean {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node || node.unlocked) return false;
    if (credits < node.cost) return false;
    return node.requires.every(r => this.nodes.find(n => n.id === r)?.unlocked);
  }

  unlock(nodeId: string, credits: number): { success: boolean; cost: number; remainingCredits: number; node?: TechNode } {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return { success: false, cost: 0, remainingCredits: credits };
    if (!this.canUnlock(nodeId, credits)) return { success: false, cost: node.cost, remainingCredits: credits };
    node.unlocked = true;
    if (this.onUnlocked) this.onUnlocked(node);
    return { success: true, cost: node.cost, remainingCredits: credits - node.cost, node };
  }

  getUnlockedCount(): number {
    return this.nodes.filter(n => n.unlocked).length;
  }
}
