import { _decorator, Component, Color, find, Graphics, Label, Layers, Node, UITransform, UIOpacity, Vec3 } from 'cc';
import { eventBus, GameEvent } from './EventBus';
import { TimeSystem } from './TimeSystem';
import { PerformanceSystem } from './PerformanceSystem';

const { ccclass, property } = _decorator;

/**
 * 天气系统
 * 
 * 功能：
 * - 随机天气变化（晴天/多云/雨天/暴风雨/雪）
 * - 天气影响作物生长速度
 * - 季节影响天气概率
 * - 天气事件通知
 */
@ccclass('WeatherSystem')
export class WeatherSystem extends Component {
    private static instance: WeatherSystem = null;

    // 天气类型
    public static readonly WEATHER = {
        SUNNY: 'sunny',
        CLOUDY: 'cloudy',
        RAINY: 'rainy',
        STORMY: 'stormy',
        SNOWY: 'snowy',
    } as const;

    // 各季节天气权重 [sunny, cloudy, rainy, stormy, snowy]
    private readonly SEASON_WEIGHTS: Record<string, number[]> = {
        spring: [40, 25, 25, 5, 5],
        summer: [50, 15, 20, 10, 5],
        autumn: [30, 35, 25, 5, 5],
        winter: [15, 25, 10, 5, 45],
    };

    // 天气对生长的影响倍率
    private readonly GROWTH_MULTIPLIER: Record<string, number> = {
        sunny: 1.0,
        cloudy: 0.9,
        rainy: 1.2,    // 雨天促进生长
        stormy: 0.5,   // 暴风雨抑制生长
        snowy: 0.3,    // 雪天严重抑制
    };

    // 当前天气状态
    private _currentWeather: string = WeatherSystem.WEATHER.SUNNY;
    private _weatherDuration: number = 0;       // 当前天气剩余游戏分钟
    private _weatherTimer: number = 0;
    private _visualRoot: Node | null = null;
    private _weatherLabel: Label | null = null;
    private _overlay: Graphics | null = null;
    private _particles: { node: Node; speed: number; drift: number }[] = [];
    private readonly VISUAL_WIDTH = 720;
    private readonly VISUAL_HEIGHT = 1280;

    // 事件名
    public static readonly EVENT_WEATHER_CHANGED = 'weather_changed';

    // ==================== 单例 ====================

    onLoad() {
        if (WeatherSystem.instance) {
            this.node.destroy();
            return;
        }
        WeatherSystem.instance = this;

        // 初始天气
        this._currentWeather = WeatherSystem.WEATHER.SUNNY;
        this._weatherDuration = this.randomDuration();
        this._weatherTimer = 0;
        this.createVisualLayer();
        this.refreshVisuals();
        eventBus.on(GameEvent.PERFORMANCE_MODE_CHANGED, this.onPerformanceModeChanged, this);

        console.log('[WeatherSystem] 初始化完成');
    }

    onDestroy() {
        eventBus.off(GameEvent.PERFORMANCE_MODE_CHANGED, this.onPerformanceModeChanged, this);
        this.clearParticles();
        if (this._visualRoot?.isValid) {
            this._visualRoot.destroy();
        }
        if (WeatherSystem.instance === this) {
            WeatherSystem.instance = null;
        }
    }

    public static getInstance(): WeatherSystem {
        return WeatherSystem.instance;
    }

    // ==================== 每帧更新 ====================

    update(deltaTime: number) {
        this._weatherTimer += deltaTime * 60; // 转换为游戏秒

        if (this._weatherTimer >= this._weatherDuration * 60) {
            this._weatherTimer = 0;
            this.changeWeather();
        }

        this.updateParticles(deltaTime);
    }

    // ==================== 公共 API ====================

    /** 当前天气 */
    public get currentWeather(): string {
        return this._currentWeather;
    }

    /** 生长倍率 */
    public get growthMultiplier(): number {
        return this.GROWTH_MULTIPLIER[this._currentWeather] || 1.0;
    }

    /** 获取天气数据 */
    public getWeatherData() {
        return {
            type: this._currentWeather,
            growthMultiplier: this.growthMultiplier,
            remainingMinutes: Math.max(0, this._weatherDuration - this._weatherTimer / 60),
        };
    }

    /** 获取天气中文名 */
    public getWeatherName(weather?: string): string {
        const names: Record<string, string> = {
            sunny: '晴天',
            cloudy: '多云',
            rainy: '雨天',
            stormy: '暴风雨',
            snowy: '雪天',
        };
        return names[weather || this._currentWeather] || '未知';
    }

    /** 手动设置天气（调试用） */
    public setWeather(weather: string, duration?: number) {
        this._currentWeather = weather;
        this._weatherDuration = duration || this.randomDuration();
        this._weatherTimer = 0;
        this.onWeatherChanged();
    }

    // ==================== 存档 ====================

    public getSaveData() {
        return {
            currentWeather: this._currentWeather,
            weatherTimer: this._weatherTimer,
            weatherDuration: this._weatherDuration,
        };
    }

    public restoreFromSave(data: { currentWeather: string; weatherTimer: number; weatherDuration: number }) {
        if (data) {
            this._currentWeather = data.currentWeather || WeatherSystem.WEATHER.SUNNY;
            this._weatherTimer = data.weatherTimer || 0;
            this._weatherDuration = data.weatherDuration || this.randomDuration();
            this.refreshVisuals();
            console.log(`[WeatherSystem] 从存档恢复: ${this.getWeatherName()}`);
        }
    }

    // ==================== 内部方法 ====================

    /** 随机变换天气 */
    private changeWeather() {
        // 从 TimeSystem 获取当前季节
        const timeSystem = TimeSystem.getInstance();
        const season = timeSystem ? timeSystem.season : 'spring';
        const weights = this.SEASON_WEIGHTS[season] || this.SEASON_WEIGHTS.spring;

        // 加权随机选择
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;
        const weatherTypes = Object.values(WeatherSystem.WEATHER);

        for (let i = 0; i < weatherTypes.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                this._currentWeather = weatherTypes[i];
                break;
            }
        }

        this._weatherDuration = this.randomDuration();
        this.onWeatherChanged();
    }

    /** 随机天气持续时间（游戏分钟） */
    private randomDuration(): number {
        return 10 + Math.floor(Math.random() * 50); // 10~60分钟
    }

    /** 天气变化回调 */
    private onWeatherChanged() {
        const name = this.getWeatherName();
        const multiplier = this.growthMultiplier;
        console.log(`[WeatherSystem] 天气变化: ${name} (生长倍率: ${multiplier}x)`);
        const data = this.getWeatherData();
        this.node.emit(WeatherSystem.EVENT_WEATHER_CHANGED, data);
        eventBus.emit(GameEvent.WEATHER_CHANGED, data);
        this.refreshVisuals();
    }

    private onPerformanceModeChanged() {
        this.rebuildParticles();
    }

    private createVisualLayer() {
        const canvas = find('Canvas');
        if (!canvas) return;

        const root = new Node('WeatherVisualLayer');
        root.layer = Layers.Enum.UI_2D;
        const rootTransform = root.addComponent(UITransform);
        rootTransform.setContentSize(this.VISUAL_WIDTH, this.VISUAL_HEIGHT);
        root.parent = canvas;
        root.setSiblingIndex(canvas.children.length - 1);
        this._visualRoot = root;

        const overlayNode = new Node('WeatherOverlay');
        overlayNode.layer = Layers.Enum.UI_2D;
        overlayNode.addComponent(UITransform).setContentSize(this.VISUAL_WIDTH, this.VISUAL_HEIGHT);
        overlayNode.parent = root;
        this._overlay = overlayNode.addComponent(Graphics);
        overlayNode.addComponent(UIOpacity).opacity = 0;

        const badge = new Node('WeatherBadge');
        badge.layer = Layers.Enum.UI_2D;
        badge.setPosition(248, 548, 20);
        badge.addComponent(UITransform).setContentSize(190, 34);
        badge.parent = root;
        this._weatherLabel = badge.addComponent(Label);
        this._weatherLabel.fontSize = 18;
        this._weatherLabel.color = new Color(245, 248, 238, 235);
        this._weatherLabel.horizontalAlign = Label.HorizontalAlign.RIGHT;
        this._weatherLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this._weatherLabel.overflow = Label.Overflow.SHRINK;
    }

    private refreshVisuals() {
        if (!this._visualRoot?.isValid) {
            this.createVisualLayer();
        }

        if (this._weatherLabel) {
            const speed = Math.round(this.growthMultiplier * 100);
            this._weatherLabel.string = `${this.getWeatherName()}  生长${speed}%`;
        }

        this.drawOverlay();
        this.rebuildParticles();
    }

    private drawOverlay() {
        if (!this._overlay) return;

        const overlayNode = this._overlay.node;
        const opacity = overlayNode.getComponent(UIOpacity) || overlayNode.addComponent(UIOpacity);
        this._overlay.clear();

        let tint = new Color(255, 255, 255, 0);
        switch (this._currentWeather) {
            case WeatherSystem.WEATHER.CLOUDY:
                tint = new Color(95, 112, 120, 30);
                break;
            case WeatherSystem.WEATHER.RAINY:
                tint = new Color(52, 84, 120, 46);
                break;
            case WeatherSystem.WEATHER.STORMY:
                tint = new Color(22, 28, 46, 82);
                break;
            case WeatherSystem.WEATHER.SNOWY:
                tint = new Color(214, 232, 245, 52);
                break;
        }

        opacity.opacity = tint.a;
        this._overlay.fillColor = new Color(tint.r, tint.g, tint.b, 255);
        this._overlay.rect(-this.VISUAL_WIDTH / 2, -this.VISUAL_HEIGHT / 2, this.VISUAL_WIDTH, this.VISUAL_HEIGHT);
        this._overlay.fill();
    }

    private rebuildParticles() {
        this.clearParticles();
        const perf = PerformanceSystem.getInstance();
        if (perf?.isLowPerformanceMode()) return;

        if (![WeatherSystem.WEATHER.RAINY, WeatherSystem.WEATHER.STORMY, WeatherSystem.WEATHER.SNOWY].includes(this._currentWeather as any)) {
            return;
        }

        const count = this._currentWeather === WeatherSystem.WEATHER.STORMY ? 34 : (this._currentWeather === WeatherSystem.WEATHER.RAINY ? 24 : 20);
        for (let i = 0; i < count; i++) {
            this.createParticle(i);
        }
    }

    private createParticle(index: number) {
        if (!this._visualRoot) return;

        const node = new Node(`WeatherParticle_${index}`);
        node.layer = Layers.Enum.UI_2D;
        node.addComponent(UITransform).setContentSize(16, 34);
        node.parent = this._visualRoot;

        const g = node.addComponent(Graphics);
        if (this._currentWeather === WeatherSystem.WEATHER.SNOWY) {
            g.fillColor = new Color(255, 255, 255, 205);
            g.circle(0, 0, 3.2);
            g.fill();
        } else {
            g.strokeColor = this._currentWeather === WeatherSystem.WEATHER.STORMY
                ? new Color(150, 190, 235, 185)
                : new Color(155, 205, 245, 155);
            g.lineWidth = this._currentWeather === WeatherSystem.WEATHER.STORMY ? 2 : 1.2;
            g.moveTo(0, 14);
            g.lineTo(-8, -14);
            g.stroke();
        }

        node.setPosition(
            -this.VISUAL_WIDTH / 2 + Math.random() * this.VISUAL_WIDTH,
            -this.VISUAL_HEIGHT / 2 + Math.random() * this.VISUAL_HEIGHT,
            10
        );

        this._particles.push({
            node,
            speed: this._currentWeather === WeatherSystem.WEATHER.SNOWY ? 55 + Math.random() * 35 : 420 + Math.random() * 220,
            drift: this._currentWeather === WeatherSystem.WEATHER.SNOWY ? -18 + Math.random() * 36 : -110,
        });
    }

    private updateParticles(dt: number) {
        if (this._particles.length === 0) return;

        const left = -this.VISUAL_WIDTH / 2;
        const right = this.VISUAL_WIDTH / 2;
        const bottom = -this.VISUAL_HEIGHT / 2;
        const top = this.VISUAL_HEIGHT / 2;

        for (const particle of this._particles) {
            if (!particle.node.isValid) continue;

            const pos = particle.node.position;
            let x = pos.x + particle.drift * dt;
            let y = pos.y - particle.speed * dt;

            if (y < bottom - 40 || x < left - 60) {
                x = left + Math.random() * this.VISUAL_WIDTH;
                y = top + Math.random() * 120;
            } else if (x > right + 60) {
                x = left - 20;
            }

            particle.node.setPosition(new Vec3(x, y, pos.z));
        }
    }

    private clearParticles() {
        for (const particle of this._particles) {
            if (particle.node?.isValid) {
                particle.node.destroy();
            }
        }
        this._particles.length = 0;
    }
}
