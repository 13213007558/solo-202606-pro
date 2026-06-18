import { Planet, ResourceType, PlanetConfig } from './planet';
import { TradeRoute } from './tradeRoute';
import { EventSystem, TechTree, GameEvent, EventSeverity, TechNode, TechEffect } from './eventSystem';
import { CanvasRenderer } from './renderer';

const RESOURCE_NAMES: Record<ResourceType, string> = {
  metal: '金属',
  energy: '能源',
  food: '食物'
};

const RESOURCE_ICONS: Record<ResourceType, string> = {
  metal: '◆',
  energy: '⚡',
  food: '🍃'
};

const SEVERITY_STYLES: Record<EventSeverity, { bg: string; border: string; text: string; dot: string }> = {
  info:    { bg: 'rgba(90, 120, 200, 0.12)',  border: 'rgba(130, 160, 240, 0.3)',  text: '#b8c8ff', dot: '#6f8cff' },
  warning: { bg: 'rgba(230, 170, 60, 0.14)',  border: 'rgba(255, 190, 90, 0.35)',  text: '#ffd99a', dot: '#ffb447' },
  danger:  { bg: 'rgba(230, 70, 90, 0.18)',   border: 'rgba(255, 100, 120, 0.45)',  text: '#ffb0b8', dot: '#ff5570' },
  success: { bg: 'rgba(90, 220, 140, 0.14)',  border: 'rgba(120, 240, 170, 0.35)',  text: '#b0f2c8', dot: '#58e59c' }
};

class GameApp {
  private planets: Planet[] = [];
  private routes: TradeRoute[] = [];
  private credits: number = 500;
  private eventSystem: EventSystem;
  private techTree: TechTree;
  private renderer: CanvasRenderer | null = null;
  private lastFrameTime: number = 0;
  private lastLogicTick: number = 0;
  private rafId: number = 0;
  private selectedPlanet: Planet | null = null;

  private appRoot!: HTMLElement;
  private topBar!: HTMLElement;
  private canvasWrap!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private sidePanel!: HTMLElement;
  private bottomPanel!: HTMLElement;
  private eventLogList!: HTMLElement;
  private fpsEl!: HTMLElement;
  private creditsEl!: HTMLElement;
  private resourceTotalsEl!: HTMLElement;
  private planetDetailEl!: HTMLElement;
  private techTreeEl!: HTMLElement;
  private routeListEl!: HTMLElement;

  private totalMetal = 0;
  private totalEnergy = 0;
  private totalFood = 0;
  private fpsCounter = { frames: 0, lastTime: 0, value: 0 };

  constructor() {
    this.eventSystem = new EventSystem();
    this.techTree = new TechTree();
    this.bootstrap();
  }

  private bootstrap(): void {
    this.appRoot = document.getElementById('app')!;
    this.buildDOM();
    this.createInitialWorld();
    this.initRenderer();
    this.bindUIActions();
    this.bindCallbacks();
    this.startLoop();
    this.refreshAllUI();
  }

  private buildDOM(): void {
    const root = this.appRoot;
    root.innerHTML = '';

    this.topBar = this.el('div', {
      class: 'top-bar',
      style: 'display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:linear-gradient(180deg,rgba(25,18,70,0.95) 0%,rgba(20,14,60,0.85) 100%);border-bottom:1px solid rgba(130,110,220,0.25);backdrop-filter:blur(12px);z-index:10;'
    });

    const title = this.el('div', { style: 'display:flex;align-items:center;gap:12px;' });
    title.innerHTML = `
      <div style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#b9a8ff,#6a4edc 60%,#2d1b7a);box-shadow:0 0 20px rgba(150,120,255,0.6);"></div>
      <div>
        <div style="font-size:20px;font-weight:700;background:linear-gradient(90deg,#c9b8ff,#9de0ff);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:1px;">星际贸易模拟器</div>
        <div style="font-size:11px;color:rgba(180,170,230,0.6);letter-spacing:2px;">GALACTIC TRADE NETWORK</div>
      </div>
    `;

    this.resourceTotalsEl = this.el('div', { style: 'display:flex;gap:28px;align-items:center;' });
    this.creditsEl = this.el('div', { style: 'font-size:22px;font-weight:700;color:#ffd866;letter-spacing:0.5px;text-shadow:0 0 12px rgba(255,216,102,0.4);' });
    this.fpsEl = this.el('div', { style: 'font-size:11px;color:rgba(180,170,230,0.5);font-family:monospace;min-width:50px;text-align:right;' });

    this.topBar.appendChild(title);
    this.topBar.appendChild(this.resourceTotalsEl);
    const right = this.el('div', { style: 'display:flex;align-items:center;gap:24px;' });
    right.appendChild(this.creditsEl);
    right.appendChild(this.fpsEl);
    this.topBar.appendChild(right);

    const mainWrap = this.el('div', { style: 'flex:1;display:flex;min-height:0;' });

    this.canvasWrap = this.el('div', { style: 'flex:1;position:relative;min-width:0;' });
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.canvasWrap.appendChild(this.canvas);

    this.sidePanel = this.el('div', {
      style: 'width:340px;display:flex;flex-direction:column;border-left:1px solid rgba(130,110,220,0.2);background:rgba(15,10,45,0.55);backdrop-filter:blur(8px);overflow:hidden;'
    });

    const panelHeader = this.el('div', { style: 'padding:14px 18px;border-bottom:1px solid rgba(130,110,220,0.2);display:flex;gap:4px;' });
    const tabs = [
      { id: 'planet', label: '星球详情' },
      { id: 'tech', label: '科技树' },
      { id: 'routes', label: '贸易路线' }
    ];
    tabs.forEach((tab, idx) => {
      const btn = this.el('button', {
        'data-tab': tab.id,
        style: `flex:1;padding:8px 10px;font-size:12px;background:${idx === 0 ? 'rgba(120,90,220,0.35)' : 'rgba(60,50,120,0.3)'};color:${idx === 0 ? '#fff' : 'rgba(200,190,240,0.7)'};border:1px solid ${idx === 0 ? 'rgba(160,130,255,0.5)' : 'rgba(90,70,180,0.3)'};border-radius:6px;cursor:pointer;transition:all 0.2s;font-weight:600;`
      });
      btn.textContent = tab.label;
      panelHeader.appendChild(btn);
    });

    this.planetDetailEl = this.el('div', { 'data-panel': 'planet', style: 'flex:1;overflow-y:auto;padding:16px;' });
    this.techTreeEl = this.el('div', { 'data-panel': 'tech', style: 'flex:1;overflow-y:auto;padding:16px;display:none;' });
    this.routeListEl = this.el('div', { 'data-panel': 'routes', style: 'flex:1;overflow-y:auto;padding:16px;display:none;' });

    this.sidePanel.appendChild(panelHeader);
    this.sidePanel.appendChild(this.planetDetailEl);
    this.sidePanel.appendChild(this.techTreeEl);
    this.sidePanel.appendChild(this.routeListEl);

    mainWrap.appendChild(this.canvasWrap);
    mainWrap.appendChild(this.sidePanel);

    this.bottomPanel = this.el('div', {
      style: 'height:180px;display:flex;flex-direction:column;border-top:1px solid rgba(130,110,220,0.25);background:linear-gradient(0deg,rgba(15,10,45,0.9) 0%,rgba(20,14,60,0.75) 100%);backdrop-filter:blur(10px);'
    });
    const logHeader = this.el('div', { style: 'padding:10px 22px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(130,110,220,0.15);' });
    logHeader.innerHTML = `
      <div style="font-size:13px;font-weight:600;color:#d8ceff;letter-spacing:1px;">📡 事件日志 / EVENT LOG</div>
      <div style="font-size:11px;color:rgba(180,170,230,0.45);" id="event-count">共 0 条记录</div>
    `;
    this.eventLogList = this.el('div', { style: 'flex:1;overflow-y:auto;padding:10px 22px;display:flex;flex-direction:column;gap:6px;' });

    this.bottomPanel.appendChild(logHeader);
    this.bottomPanel.appendChild(this.eventLogList);

    root.appendChild(this.topBar);
    root.appendChild(mainWrap);
    root.appendChild(this.bottomPanel);
  }

  private el(tag: string, attrs: Record<string, string> = {}): HTMLElement {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'style') e.style.cssText = attrs[k];
      else if (k.startsWith('data-')) e.setAttribute(k, attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    return e;
  }

  private createInitialWorld(): void {
    const baseStorage = 800;
    const planetConfigs: PlanetConfig[] = [
      {
        id: 'p1', name: '泰拉 Prime',
        x: 0, y: 0,
        color: '#7aa5ff',
        storageCapacity: baseStorage,
        initialResources: { metal: 300, energy: 400, food: 500 },
        productionRates: { metal: 2.2, energy: 4.0, food: 5.5 }
      },
      {
        id: 'p2', name: '赫菲斯托斯',
        x: 0, y: 0,
        color: '#ff8a65',
        storageCapacity: baseStorage,
        initialResources: { metal: 600, energy: 200, food: 150 },
        productionRates: { metal: 6.5, energy: 1.8, food: 0.8 }
      },
      {
        id: 'p3', name: '宁芙利亚',
        x: 0, y: 0,
        color: '#81d4a0',
        storageCapacity: baseStorage,
        initialResources: { metal: 180, energy: 250, food: 650 },
        productionRates: { metal: 1.2, energy: 2.5, food: 7.2 }
      },
      {
        id: 'p4', name: '伏尔甘',
        x: 0, y: 0,
        color: '#ffd166',
        storageCapacity: baseStorage,
        initialResources: { metal: 350, energy: 550, food: 180 },
        productionRates: { metal: 3.8, energy: 7.5, food: 1.0 }
      },
      {
        id: 'p5', name: '塞壬之泪',
        x: 0, y: 0,
        color: '#c084fc',
        storageCapacity: baseStorage * 1.1,
        initialResources: { metal: 250, energy: 300, food: 400 },
        productionRates: { metal: 3.0, energy: 3.5, food: 3.8 }
      }
    ];

    this.planets = planetConfigs.map(c => new Planet(c));
    this.positionPlanets();

    const travelBase = 5500;
    this.routes = [
      new TradeRoute({ id: 'r1', from: this.planets[1], to: this.planets[0], resourceType: 'metal',  amount: 40, capacity: 6, baseTravelTimeMs: travelBase }),
      new TradeRoute({ id: 'r2', from: this.planets[0], to: this.planets[2], resourceType: 'energy', amount: 35, capacity: 6, baseTravelTimeMs: travelBase }),
      new TradeRoute({ id: 'r3', from: this.planets[2], to: this.planets[1], resourceType: 'food',   amount: 45, capacity: 6, baseTravelTimeMs: travelBase * 0.9 }),
      new TradeRoute({ id: 'r4', from: this.planets[3], to: this.planets[0], resourceType: 'energy', amount: 50, capacity: 7, baseTravelTimeMs: travelBase * 1.1 }),
      new TradeRoute({ id: 'r5', from: this.planets[0], to: this.planets[4], resourceType: 'metal',  amount: 30, capacity: 5, baseTravelTimeMs: travelBase * 1.3 }),
      new TradeRoute({ id: 'r6', from: this.planets[4], to: this.planets[3], resourceType: 'food',   amount: 35, capacity: 5, baseTravelTimeMs: travelBase }),
    ];
  }

  private positionPlanets(): void {
    requestAnimationFrame(() => {
      const w = this.canvasWrap.clientWidth || 1280;
      const h = this.canvasWrap.clientHeight || 700;
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.32;

      this.planets.forEach((p, i) => {
        if (i === 0) {
          p.x = cx;
          p.y = cy;
        } else {
          const angle = (-Math.PI / 2) + ((i - 1) / (this.planets.length - 1)) * Math.PI * 2;
          const r = R * (0.85 + Math.sin(i * 1.3) * 0.12);
          p.x = cx + Math.cos(angle) * r;
          p.y = cy + Math.sin(angle) * r;
        }
      });
    });
  }

  private initRenderer(): void {
    this.renderer = new CanvasRenderer(this.canvas);
    this.renderer.setData(this.planets, this.routes);
    this.renderer.onPlanetClick = (p) => {
      this.selectedPlanet = p;
      this.renderer!.setSelectedPlanet(p.id);
      this.switchTab('planet');
      this.refreshPlanetDetail();
    };
  }

  private bindUIActions(): void {
    this.sidePanel.querySelectorAll<HTMLElement>('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.getAttribute('data-tab')!));
    });
  }

  private switchTab(id: string): void {
    this.sidePanel.querySelectorAll<HTMLElement>('[data-tab]').forEach(btn => {
      const active = btn.getAttribute('data-tab') === id;
      btn.style.background = active ? 'rgba(120,90,220,0.35)' : 'rgba(60,50,120,0.3)';
      btn.style.color = active ? '#fff' : 'rgba(200,190,240,0.7)';
      btn.style.borderColor = active ? 'rgba(160,130,255,0.5)' : 'rgba(90,70,180,0.3)';
    });
    this.sidePanel.querySelectorAll<HTMLElement>('[data-panel]').forEach(panel => {
      panel.style.display = panel.getAttribute('data-panel') === id ? 'block' : 'none';
    });
    if (id === 'tech') this.refreshTechTree();
    if (id === 'routes') this.refreshRouteList();
    if (id === 'planet') this.refreshPlanetDetail();
  }

  private bindCallbacks(): void {
    this.eventSystem.onWarningStart = () => this.renderer?.triggerWarningFlash();
    this.eventSystem.onWarningEnd = () => {
      if (!this.eventSystem.hasActiveWarnings()) this.renderer?.endWarning();
    };
    this.techTree.onUnlocked = (node) => {
      this.addEventLog({
        id: 'tech_' + node.id, type: 'tech_unlock', severity: 'success',
        timestamp: Date.now(),
        message: `🏆 解锁科技「${node.name}」：${node.description}`
      });
      this.applyTechEffects();
      this.refreshTechTree();
    };
  }

  private applyTechEffects(): void {
    const eff = this.techTree.getCumulativeEffects();
    if (eff.storageCapacityBonus) {
      const base = 800;
      this.planets.forEach((p, i) => {
        const mult = i === 4 ? 1.1 : 1;
        p.storageCapacity = Math.floor(base * mult * (1 + (eff.storageCapacityBonus ?? 0)));
      });
    }
    this.eventSystem.setEventChanceMultiplier(1 - (eff.eventChanceReduction ?? 0));
  }

  private startLoop(): void {
    this.lastFrameTime = performance.now();
    this.lastLogicTick = performance.now();
    this.fpsCounter.lastTime = performance.now();

    const tick = (now: number) => {
      const deltaFrame = Math.min(50, now - this.lastFrameTime);
      this.lastFrameTime = now;

      const eff = this.techTree.getCumulativeEffects();
      this.updateLogic(now, deltaFrame, eff);
      this.renderer?.render(deltaFrame);
      this.updateFPS(now);

      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private updateLogic(nowMs: number, deltaMs: number, techEffects: TechEffect): void {
    const deltaSec = deltaMs / 1000;

    const startEvt = performance.now();
    this.eventSystem.tick({
      planets: this.planets,
      routes: this.routes,
      getCredits: () => this.credits,
      addCredits: (n) => { this.credits += n; },
      pushEvent: (e) => this.addEventLog(e),
      techEffects
    });
    void startEvt;

    for (const planet of this.planets) {
      planet.update(deltaSec, techEffects.globalProductionMultiplier ?? 1);
    }

    for (const route of this.routes) {
      route.speedMultiplier = (techEffects.globalSpeedMultiplier ?? 1);
      route.capacityMultiplier = (techEffects.globalCapacityMultiplier ?? 1);
      route.update(nowMs, deltaMs, (credits) => {
        this.credits += credits;
      });
    }

    const nowSec = nowMs / 1000;
    const tickInterval = 0.15;
    if (nowSec - (this.lastLogicTick / 1000) >= tickInterval) {
      this.lastLogicTick = nowMs;
      this.recalcTotals();
      this.refreshTopBar();
      if (this.selectedPlanet) this.refreshPlanetDetail(true);
    }
  }

  private recalcTotals(): void {
    let m = 0, en = 0, fd = 0;
    for (const p of this.planets) {
      m += p.resources.metal;
      en += p.resources.energy;
      fd += p.resources.food;
    }
    this.totalMetal = m;
    this.totalEnergy = en;
    this.totalFood = fd;
  }

  private updateFPS(now: number): void {
    this.fpsCounter.frames++;
    if (now - this.fpsCounter.lastTime >= 500) {
      this.fpsCounter.value = Math.round(this.fpsCounter.frames * 1000 / (now - this.fpsCounter.lastTime));
      this.fpsCounter.frames = 0;
      this.fpsCounter.lastTime = now;
      this.fpsEl.textContent = `${this.fpsCounter.value} FPS`;
      this.fpsEl.style.color = this.fpsCounter.value >= 30 ? '#58e59c' : '#ffb447';
    }
  }

  private refreshAllUI(): void {
    this.recalcTotals();
    this.refreshTopBar();
    this.refreshPlanetDetail();
    this.refreshTechTree();
    this.refreshRouteList();
  }

  private refreshTopBar(): void {
    this.creditsEl.textContent = `💰 ${this.credits.toLocaleString()} CR`;
    const items: { type: ResourceType; val: number }[] = [
      { type: 'metal', val: this.totalMetal },
      { type: 'energy', val: this.totalEnergy },
      { type: 'food', val: this.totalFood }
    ];
    const colors = { metal: '#6fa8ff', energy: '#ffd866', food: '#7ee787' };
    this.resourceTotalsEl.innerHTML = items.map(it => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 14px;background:rgba(40,30,90,0.55);border:1px solid rgba(120,100,220,0.25);border-radius:8px;">
        <span style="font-size:18px;color:${colors[it.type]};filter:drop-shadow(0 0 4px ${colors[it.type]}66);">${RESOURCE_ICONS[it.type]}</span>
        <div>
          <div style="font-size:10px;color:rgba(180,170,230,0.55);letter-spacing:1px;">${RESOURCE_NAMES[it.type]}</div>
          <div style="font-size:15px;font-weight:700;color:${colors[it.type]};line-height:1.1;">${Math.floor(it.val).toLocaleString()}</div>
        </div>
      </div>
    `).join('');
  }

  private refreshPlanetDetail(silent = false): void {
    const p = this.selectedPlanet;
    const host = this.planetDetailEl;
    if (!p) {
      host.innerHTML = `
        <div style="padding:40px 20px;text-align:center;color:rgba(180,170,230,0.5);">
          <div style="font-size:48px;margin-bottom:14px;">🌌</div>
          <div style="font-size:13px;">点击画布中任意星球<br/>查看详情与操作</div>
        </div>
      `;
      return;
    }

    const types: ResourceType[] = ['metal', 'energy', 'food'];
    const colors = { metal: '#6fa8ff', energy: '#ffd866', food: '#7ee787' };

    const resourceBlocks = types.map(t => {
      const ratio = p.getResourceRatio(t);
      const level = p.facilityLevels[t];
      const rate = (p.productionRates[t] * level).toFixed(1);
      const cost = p.getUpgradeCost(t);
      const canUpgrade = this.credits >= cost;
      return `
        <div style="padding:12px;background:rgba(35,25,80,0.6);border:1px solid rgba(120,100,220,0.2);border-radius:10px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;color:${colors[t]};filter:drop-shadow(0 0 4px ${colors[t]}66);">${RESOURCE_ICONS[t]}</span>
              <span style="font-weight:600;color:#e0d8ff;font-size:13px;">${RESOURCE_NAMES[t]}</span>
            </div>
            <span style="font-size:11px;color:rgba(180,170,230,0.55);">Lv.${level} · +${rate}/s</span>
          </div>
          <div style="height:8px;background:rgba(60,50,120,0.6);border-radius:4px;overflow:hidden;margin-bottom:6px;">
            <div style="height:100%;width:${(ratio * 100).toFixed(0)}%;background:linear-gradient(90deg,${colors[t]}bb,${colors[t]});box-shadow:0 0 10px ${colors[t]}88;transition:width 0.3s;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;">
            <span style="color:${colors[t]};font-weight:600;">${Math.floor(p.resources[t]).toLocaleString()} / ${p.storageCapacity.toLocaleString()}</span>
            <button data-upgrade="${t}" style="padding:4px 12px;font-size:11px;background:${canUpgrade ? 'linear-gradient(135deg,#6a4edc,#8a6eff)' : 'rgba(80,70,140,0.4)'};color:${canUpgrade ? '#fff' : 'rgba(200,190,240,0.4)'};border:none;border-radius:5px;cursor:${canUpgrade ? 'pointer' : 'not-allowed'};font-weight:600;box-shadow:${canUpgrade ? '0 2px 10px rgba(120,90,220,0.4)' : 'none'};transition:all 0.2s;">
              升级 ${cost} CR
            </button>
          </div>
        </div>
      `;
    }).join('');

    const eventTags = p.activeEvents.size > 0
      ? `<div style="margin-top:10px;padding:8px 12px;background:rgba(230,70,90,0.12);border:1px solid rgba(255,100,120,0.3);border-radius:6px;font-size:11px;color:#ffb0b8;">⚠️ ${p.activeEvents.size} 个事件影响中</div>`
      : '';

    const planetOrbitRatio = p.getOverallResourceRatio();
    host.innerHTML = `
      <div style="text-align:center;padding:10px 0 18px;">
        <div style="width:96px;height:96px;margin:0 auto 12px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#fff3,${p.color} 50%,#000 130%);box-shadow:0 0 30px ${p.color}66,inset -10px -10px 20px rgba(0,0,0,0.4);position:relative;">
          <div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid ${p.color}55;border-top-color:${p.color};animation:spin 8s linear infinite;"></div>
        </div>
        <div style="font-size:18px;font-weight:700;color:#e8e2ff;letter-spacing:1px;">${p.name}</div>
        <div style="font-size:11px;color:rgba(180,170,230,0.5);margin-top:2px;">ID: ${p.id.toUpperCase()} · 总体存量 ${(planetOrbitRatio * 100).toFixed(0)}%</div>
        ${eventTags}
      </div>
      <div style="font-size:11px;font-weight:600;color:rgba(180,170,230,0.7);letter-spacing:2px;margin-bottom:10px;padding-left:4px;">⬢ 资源与生产设施</div>
      ${resourceBlocks}
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    `;

    if (!silent) {
      host.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-upgrade') as ResourceType;
          const result = p.upgradeFacility(type, this.credits);
          if (result.success) {
            this.credits = result.credits;
            this.addEventLog({
              id: 'upg_' + type + '_' + Date.now(),
              type: 'upgrade', severity: 'success',
              timestamp: Date.now(),
              message: `🛠 ${p.name} 的${RESOURCE_NAMES[type]}设施升级至 Lv.${p.facilityLevels[type]}`
            });
            this.refreshAllUI();
          } else {
            btn.animate([
              { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
              { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }
            ], { duration: 250 });
          }
        });
      });
    }
  }

  private refreshTechTree(): void {
    const host = this.techTreeEl;
    host.innerHTML = `
      <div style="padding:10px 0 16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <div style="font-size:15px;font-weight:700;color:#e8e2ff;">🔬 科技研发中心</div>
          <div style="font-size:11px;color:rgba(180,170,230,0.55);">已解锁 ${this.techTree.getUnlockedCount()}/${this.techTree.nodes.length}</div>
        </div>
        <div style="font-size:11px;color:rgba(180,170,230,0.45);margin-bottom:14px;">消耗贸易利润解锁永久全局加成</div>
      </div>
      <div style="position:relative;">
        ${this.techTree.nodes.map((node, i) => this.renderTechNode(node, i)).join('')}
      </div>
    `;

    host.querySelectorAll<HTMLButtonElement>('[data-tech]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-tech')!;
        const result = this.techTree.unlock(id, this.credits);
        if (result.success) {
          this.credits = result.remainingCredits;
          this.refreshAllUI();
        } else {
          btn.animate([
            { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
            { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }
          ], { duration: 250 });
        }
      });
    });
  }

  private renderTechNode(node: TechNode, index: number): string {
    const canUnlock = this.techTree.canUnlock(node.id, this.credits);
    const status = node.unlocked ? 'unlocked' : (canUnlock ? 'available' : 'locked');
    const styles: Record<string, { border: string; bg: string; badge: string; text: string }> = {
      unlocked:  { border: 'rgba(120,240,170,0.45)', bg: 'rgba(90,220,140,0.1)', badge: '#58e59c', text: '#b0f2c8' },
      available: { border: 'rgba(160,130,255,0.5)',  bg: 'rgba(120,90,220,0.15)', badge: '#b9a8ff', text: '#e0d8ff' },
      locked:    { border: 'rgba(90,80,140,0.25)',   bg: 'rgba(40,35,80,0.4)',    badge: '#5a5080', text: 'rgba(200,190,240,0.4)' }
    };
    const s = styles[status];
    const requiresText = node.requires.length > 0
      ? node.requires.map(r => this.techTree.nodes.find(n => n.id === r)?.name).filter(Boolean).join('、')
      : '基础科技';

    return `
      <div style="margin-bottom:12px;padding:12px 14px;background:${s.bg};border:1px solid ${s.border};border-left:3px solid ${s.badge};border-radius:9px;position:relative;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span style="font-size:14px;font-weight:700;color:${s.text};">${node.name}</span>
              ${status === 'unlocked' ? '<span style="font-size:10px;padding:2px 7px;background:rgba(90,220,140,0.2);color:#58e59c;border-radius:10px;font-weight:600;">已解锁</span>' : ''}
              ${status === 'available' ? '<span style="font-size:10px;padding:2px 7px;background:rgba(160,130,255,0.2);color:#b9a8ff;border-radius:10px;font-weight:600;">可研究</span>' : ''}
              ${status === 'locked' ? '<span style="font-size:10px;padding:2px 7px;background:rgba(90,80,140,0.2);color:#8a80b8;border-radius:10px;font-weight:600;">🔒 锁定</span>' : ''}
            </div>
            <div style="font-size:11px;color:rgba(180,170,230,0.55);margin-bottom:6px;">${node.description}</div>
            <div style="font-size:10px;color:rgba(150,140,200,0.45);">前置：${requiresText}</div>
          </div>
          ${!node.unlocked ? `
            <button data-tech="${node.id}" style="padding:8px 14px;font-size:12px;background:${canUnlock ? 'linear-gradient(135deg,#6a4edc,#b9a8ff)' : 'rgba(60,55,100,0.5)'};color:${canUnlock ? '#fff' : 'rgba(200,190,240,0.35)'};border:none;border-radius:6px;cursor:${canUnlock ? 'pointer' : 'not-allowed'};font-weight:700;white-space:nowrap;box-shadow:${canUnlock ? '0 2px 14px rgba(140,100,255,0.45)' : 'none'};min-width:88px;">
              ${node.cost.toLocaleString()} CR
            </button>
          ` : ''}
        </div>
      </div>
      ${index < this.techTree.nodes.length - 1 ? '<div style="text-align:center;color:rgba(100,90,160,0.35);margin:-6px 0 6px;font-size:14px;">│</div>' : ''}
    `;
  }

  private refreshRouteList(): void {
    const host = this.routeListEl;
    host.innerHTML = `
      <div style="padding:10px 0 14px;">
        <div style="font-size:15px;font-weight:700;color:#e8e2ff;margin-bottom:4px;">🛰 贸易路线管理</div>
        <div style="font-size:11px;color:rgba(180,170,230,0.45);">共 ${this.routes.length} 条活跃路线</div>
      </div>
      ${this.routes.map(r => {
        const colors = { metal: '#6fa8ff', energy: '#ffd866', food: '#7ee787' };
        const c = colors[r.resourceType];
        const hasEvent = r.activeEvents.size > 0;
        return `
          <div style="padding:12px;margin-bottom:10px;background:rgba(35,25,80,0.6);border:1px solid ${hasEvent ? 'rgba(255,100,120,0.35)' : 'rgba(120,100,220,0.2)'};border-radius:10px;position:relative;overflow:hidden;">
            ${hasEvent ? '<div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#ff5570,#ff8a65,#ff5570);background-size:200% 100%;animation:slide 2s linear infinite;"></div>' : ''}
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
              <div style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#fff4,${r.from.color});flex-shrink:0;"></div>
              <div style="flex:1;min-width:0;text-align:center;">
                <div style="font-size:10px;color:rgba(180,170,230,0.5);letter-spacing:2px;">ROUTE ${r.id.toUpperCase()}</div>
                <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:2px;">
                  <span style="font-size:12px;font-weight:600;color:#e0d8ff;">${r.from.name}</span>
                  <span style="color:${c};font-size:16px;">→</span>
                  <span style="font-size:12px;font-weight:600;color:#e0d8ff;">${r.to.name}</span>
                </div>
              </div>
              <div style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#fff4,${r.to.color});flex-shrink:0;"></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
              <div style="padding:6px 8px;background:rgba(60,50,120,0.4);border-radius:6px;">
                <div style="font-size:9px;color:rgba(180,170,230,0.5);">运输货物</div>
                <div style="font-size:12px;font-weight:600;color:${c};display:flex;align-items:center;gap:4px;">
                  <span>${RESOURCE_ICONS[r.resourceType]}</span>${RESOURCE_NAMES[r.resourceType]}
                </div>
              </div>
              <div style="padding:6px 8px;background:rgba(60,50,120,0.4);border-radius:6px;">
                <div style="font-size:9px;color:rgba(180,170,230,0.5);">在途货物</div>
                <div style="font-size:12px;font-weight:600;color:#e0d8ff;">${r.activeCargoCount} / ${r.effectiveCapacity}</div>
              </div>
            </div>
            <div style="display:flex;gap:6px;">
              <button data-cap="${r.id}" data-op="dec" style="flex:1;padding:6px;font-size:11px;background:rgba(80,70,140,0.5);color:#e0d8ff;border:1px solid rgba(120,100,220,0.2);border-radius:5px;cursor:pointer;font-weight:600;">容量－</button>
              <button data-cap="${r.id}" data-op="inc" style="flex:1;padding:6px;font-size:11px;background:rgba(80,70,140,0.5);color:#e0d8ff;border:1px solid rgba(120,100,220,0.2);border-radius:5px;cursor:pointer;font-weight:600;">容量＋</button>
            </div>
          </div>
        `;
      }).join('')}
      <style>@keyframes slide{to{background-position:-200% 0}}</style>
    `;

    host.querySelectorAll<HTMLButtonElement>('[data-cap]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-cap')!;
        const op = btn.getAttribute('data-op')!;
        const route = this.routes.find(r => r.id === id);
        if (!route) return;
        const delta = op === 'inc' ? 1 : -1;
        route.adjustCapacity(route.capacity + delta);
        this.refreshRouteList();
      });
    });
  }

  private addEventLog(e: GameEvent): void {
    const list = this.eventLogList;
    const s = SEVERITY_STYLES[e.severity];
    const time = new Date(e.timestamp);
    const ts = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
    const types: Record<string, string> = {
      space_pirate: '🚨', resource_shortage: '📉', tech_breakthrough: '💡',
      solar_storm: '🌞', trade_bonus: '📈', tech_unlock: '🏆', upgrade: '🛠'
    };
    const icon = types[e.type] || '📡';

    const item = this.el('div', {
      style: `display:flex;align-items:flex-start;gap:10px;padding:8px 12px;background:${s.bg};border-left:3px solid ${s.dot};border-radius:0 6px 6px 0;opacity:0;transform:translateY(-6px);transition:opacity 0.25s,transform 0.25s;`
    });
    item.innerHTML = `
      <div style="width:24px;height:24px;border-radius:50%;background:${s.dot}22;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">${icon}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;color:${s.text};font-weight:500;line-height:1.4;">${e.message}</div>
        <div style="font-size:10px;color:rgba(180,170,230,0.35);margin-top:2px;font-family:monospace;">${ts} · ${e.type.toUpperCase()}</div>
      </div>
    `;
    list.insertBefore(item, list.firstChild);

    requestAnimationFrame(() => {
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    });

    while (list.children.length > 80) {
      list.removeChild(list.lastChild!);
    }

    const countEl = document.getElementById('event-count');
    if (countEl) countEl.textContent = `共 ${this.eventSystem.eventQueue.length} 条记录`;
  }
}

new GameApp();
