import { _decorator, Component } from 'cc';
import { eventBus, GameEvent } from './EventBus';
import { TimeSystem } from './TimeSystem';

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

        console.log('[WeatherSystem] 初始化完成');
    }

    onDestroy() {
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
        this.node.emit(WeatherSystem.EVENT_WEATHER_CHANGED, this.getWeatherData());
    }
}
