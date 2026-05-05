import { _decorator, Component } from 'cc';
import { eventBus, GameEvent } from './EventBus';

const { ccclass, property } = _decorator;

/**
 * 游戏时间系统
 * 
 * 功能：
 * - 管理游戏内时间流逝（天/小时/分钟/季节）
 * - 支持暂停/加速
 * - 触发季节变化事件
 * - 影响天气和作物生长
 */
@ccclass('TimeSystem')
export class TimeSystem extends Component {
    private static instance: TimeSystem = null;

    // 游戏时间配置
    private readonly REAL_SECONDS_PER_GAME_MINUTE = 1;   // 1秒=1游戏分钟
    private readonly MINUTES_PER_HOUR = 60;
    private readonly HOURS_PER_DAY = 24;
    private readonly DAYS_PER_SEASON = 30;
    private readonly SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;

    // 当前游戏时间
    private _totalMinutes: number = 0;
    private _timeScale: number = 1;
    private _isPaused: boolean = false;

    // 回调列表
    private _dayChangeCallbacks: ((day: number) => void)[] = [];
    private _seasonChangeCallbacks: ((season: string) => void)[] = [];

    // ==================== 单例 ====================

    onLoad() {
        if (TimeSystem.instance) {
            this.node.destroy();
            return;
        }
        TimeSystem.instance = this;
        console.log('[TimeSystem] 初始化完成');
    }

    onDestroy() {
        if (TimeSystem.instance === this) {
            TimeSystem.instance = null;
        }
    }

    public static getInstance(): TimeSystem {
        return TimeSystem.instance;
    }

    // ==================== 每帧更新 ====================

    update(deltaTime: number) {
        if (this._isPaused) return;

        // deltaTime 是秒，转换为游戏分钟
        const gameMinutesDelta = deltaTime * this.REAL_SECONDS_PER_GAME_MINUTE * this._timeScale;
        const oldTotalMinutes = this._totalMinutes;
        this._totalMinutes += gameMinutesDelta;

        // 检查日期变化
        const oldDay = this.getDayFromMinutes(oldTotalMinutes);
        const newDay = this.getDayFromMinutes(this._totalMinutes);
        if (newDay > oldDay) {
            this.onDayChanged(newDay);
        }

        // 检查季节变化
        const oldSeason = this.getSeasonFromMinutes(oldTotalMinutes);
        const newSeason = this.getSeasonFromMinutes(this._totalMinutes);
        if (oldSeason !== newSeason) {
            this.onSeasonChanged(newSeason);
        }
    }

    // ==================== 公共 API ====================

    /** 当前游戏日 */
    public get day(): number {
        return this.getDayFromMinutes(this._totalMinutes);
    }

    /** 当前小时 (0-23) */
    public get hour(): number {
        return Math.floor((this._totalMinutes % this.MINUTES_PER_HOUR * this.HOURS_PER_DAY) / this.MINUTES_PER_HOUR);
    }

    /** 当前分钟 (0-59) */
    public get minute(): number {
        return Math.floor(this._totalMinutes % this.MINUTES_PER_HOUR);
    }

    /** 当前季节 */
    public get season(): string {
        return this.getSeasonFromMinutes(this._totalMinutes);
    }

    /** 当前时间倍率 */
    public get timeScale(): number {
        return this._timeScale;
    }

    /** 是否暂停 */
    public get isPaused(): boolean {
        return this._isPaused;
    }

    /** 总游戏分钟数 */
    public get totalMinutes(): number {
        return this._totalMinutes;
    }

    /** 获取完整时间数据 */
    public getTimeData() {
        return {
            totalSeconds: this._totalMinutes * 60,
            day: this.day,
            hour: this.hour,
            minute: this.minute,
            season: this.season,
            timeScale: this._timeScale,
            isPaused: this._isPaused,
        };
    }

    /** 设置时间倍率 (1x, 2x, 3x...) */
    public setTimeScale(scale: number) {
        this._timeScale = Math.max(1, Math.min(10, scale));
        console.log(`[TimeSystem] 时间倍率: ${this._timeScale}x`);
    }

    /** 暂停游戏 */
    public pause() {
        if (!this._isPaused) {
            this._isPaused = true;
            eventBus.emit(GameEvent.GAME_PAUSED);
            console.log('[TimeSystem] 游戏已暂停');
        }
    }

    /** 恢复游戏 */
    public resume() {
        if (this._isPaused) {
            this._isPaused = false;
            eventBus.emit(GameEvent.GAME_RESUMED);
            console.log('[TimeSystem] 游戏已恢复');
        }
    }

    /** 切换暂停状态 */
    public togglePause() {
        if (this._isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    /** 注册日期变化回调 */
    public onDayChange(callback: (day: number) => void) {
        this._dayChangeCallbacks.push(callback);
    }

    /** 注册季节变化回调 */
    public onSeasonChange(callback: (season: string) => void) {
        this._seasonChangeCallbacks.push(callback);
    }

    // ==================== 存档 ====================

    /** 获取存档数据 */
    public getSaveData() {
        return {
            totalMinutes: this._totalMinutes,
            timeScale: this._timeScale,
        };
    }

    /** 从存档恢复 */
    public restoreFromSave(data: { totalMinutes: number; timeScale: number }) {
        if (data) {
            this._totalMinutes = data.totalMinutes || 0;
            this._timeScale = data.timeScale || 1;
            console.log(`[TimeSystem] 从存档恢复: Day ${this.day}, ${this.season}`);
        }
    }

    // ==================== 内部方法 ====================

    private getDayFromMinutes(minutes: number): number {
        return Math.floor(minutes / (this.MINUTES_PER_HOUR * this.HOURS_PER_DAY));
    }

    private getSeasonFromMinutes(minutes: number): string {
        const day = this.getDayFromMinutes(minutes);
        const seasonIndex = Math.floor(day / this.DAYS_PER_SEASON) % this.SEASONS.length;
        return this.SEASONS[seasonIndex];
    }

    private onDayChanged(newDay: number) {
        console.log(`[TimeSystem] 新的一天: Day ${newDay}`);
        for (const cb of this._dayChangeCallbacks) {
            cb(newDay);
        }
    }

    private onSeasonChanged(newSeason: string) {
        console.log(`[TimeSystem] 季节变化: ${newSeason}`);
        for (const cb of this._seasonChangeCallbacks) {
            cb(newSeason);
        }
    }
}
