// Settings.ts

import { sys, Component, _decorator, error } from 'cc';
import { common } from './Common';
const { ccclass, property } = _decorator;

/**
 * 游戏设置管理
 *
 * 管理的配置项：
 * - 音效开关
 * - 背景音乐开关
 * - 推送通知开关（预留）
 * - 画质等级（预留）
 * - 时间倍率（预留）
 */
@ccclass("Settings")
export class Settings extends Component {
    public static instance: Settings = null!;

    // 存储键名
    private readonly KEY_SOUND_EFFECT = "soundEffectSwitch";
    private readonly KEY_BGM = "bgmSwitch";
    private readonly KEY_NOTIFICATION = "notificationSwitch";
    private readonly KEY_QUALITY = "qualityLevel";
    private readonly KEY_TIME_SCALE = "timeScale";

    // 缓存值（-1=未加载）
    public soundEffectSwitch: number = -1;
    public bgmSwitch: number = -1;
    private _notificationSwitch: number = -1;
    private _qualityLevel: number = -1;
    private _timeScale: number = -1;

    protected onLoad(): void {
        Settings.instance = this;
    }

    // ==================== 音效 ====================

    public getSoundEffectSwitch(): boolean {
        if (this.soundEffectSwitch == -1) {
            this.soundEffectSwitch = sys.localStorage.getItem(this.KEY_SOUND_EFFECT) == "1" ? 1 : 0;
        }
        return this.soundEffectSwitch == 1;
    }

    public SwitchSoundEffect(toggle: boolean) {
        this.soundEffectSwitch = toggle ? 1 : 0;
        sys.localStorage.setItem(this.KEY_SOUND_EFFECT, this.soundEffectSwitch.toString());
    }

    // ==================== 背景音乐 ====================

    public getBGMSwitch(): boolean {
        if (this.bgmSwitch == -1) {
            this.bgmSwitch = sys.localStorage.getItem(this.KEY_BGM) == "1" ? 1 : 0;
        }
        return this.bgmSwitch == 1;
    }

    public SwitchBGM(toggle: boolean) {
        this.bgmSwitch = toggle ? 1 : 0;
        sys.localStorage.setItem(this.KEY_BGM, this.bgmSwitch.toString());

        if (toggle) { common.audioController.playBGM(); } else { common.audioController.stopBGM(); }
    }

    // ==================== 推送通知（预留） ====================

    public getNotificationSwitch(): boolean {
        if (this._notificationSwitch == -1) {
            this._notificationSwitch = sys.localStorage.getItem(this.KEY_NOTIFICATION) != "0" ? 1 : 0;
        }
        return this._notificationSwitch == 1;
    }

    public setNotificationSwitch(toggle: boolean) {
        this._notificationSwitch = toggle ? 1 : 0;
        sys.localStorage.setItem(this.KEY_NOTIFICATION, this._notificationSwitch.toString());
    }

    // ==================== 画质等级（预留） ====================

    /**
     * 获取画质等级
     * 0=低 1=中 2=高
     */
    public getQualityLevel(): number {
        if (this._qualityLevel == -1) {
            const saved = sys.localStorage.getItem(this.KEY_QUALITY);
            this._qualityLevel = saved ? parseInt(saved) : 2; // 默认高画质
        }
        return this._qualityLevel;
    }

    public setQualityLevel(level: number) {
        this._qualityLevel = Math.max(0, Math.min(2, level));
        sys.localStorage.setItem(this.KEY_QUALITY, this._qualityLevel.toString());
    }

    // ==================== 存档接口 ====================

    public getSaveData() {
        return {
            soundEffect: this.getSoundEffectSwitch(),
            bgm: this.getBGMSwitch(),
            notification: this.getNotificationSwitch(),
            quality: this.getQualityLevel(),
        };
    }

    public restoreFromSave(data: any) {
        if (!data) return;
        if (data.soundEffect !== undefined) this.SwitchSoundEffect(data.soundEffect);
        if (data.bgm !== undefined) this.SwitchBGM(data.bgm);
        if (data.notification !== undefined) this.setNotificationSwitch(data.notification);
        if (data.quality !== undefined) this.setQualityLevel(data.quality);
    }
}