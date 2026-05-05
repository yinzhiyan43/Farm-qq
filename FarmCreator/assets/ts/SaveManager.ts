import { _decorator, Component, game, EventTarget } from 'cc';
import { CurrencySystem } from './CurrencySystem';
import { ExpSystem } from './ExpSystem';
import { WarehouseManager } from './WarehouseManager';
import { TaskManager } from './TaskManager';
import { AchievementManager } from './AchievementManager';
import { TimeSystem } from './TimeSystem';
import { WeatherSystem } from './WeatherSystem';
import { FriendsSystem } from './FriendsSystem';
import { TutorialManager } from './TutorialManager';
import { eventBus, GameEvent } from './EventBus';
import { Soil } from './soil';
const { ccclass, property } = _decorator;

/**
 * 存档数据接口
 */
export interface SaveData {
    /** 存档版本 */
    version: string;
    /** 存档时间 */
    saveTime: number;
    /** 玩家名称 */
    playerName: string;
    /** 游戏天数 */
    gameDays: number;
    /** 游戏总时长（秒） */
    totalPlayTime: number;
}

/**
 * 存档管理器 - 管理游戏的存档和读档
 * 支持多存档、自动存档、云存档接口
 */
@ccclass('SaveManager')
export class SaveManager extends Component {
    private static _instance: SaveManager = null;
    
    /** 当前存档编号 */
    private _currentSlot: number = 0;
    
    /** 存档版本号 */
    private readonly _version: string = '1.0.0';
    
    /** 自动存档间隔（毫秒） */
    private _autoSaveInterval: number = 60000; // 1分钟
    
    /** 自动存档定时器 */
    private _autoSaveTimer: number = 0;
    
    /** 事件监听器 */
    private _eventTarget: EventTarget = new EventTarget();
    
    /** 是否正在存档 */
    private _isSaving: boolean = false;
    
    public static getInstance(): SaveManager {
        if (!this._instance) {
            console.warn('[SaveManager] 实例不存在，请确保场景中已添加 SaveManager 组件');
        }
        return this._instance;
    }
    
    onLoad() {
        if (SaveManager._instance === null) {
            SaveManager._instance = this;
            game.addPersistRootNode(this.node);
            this._startAutoSave();
            this._registerEventListeners();
            console.log('[SaveManager] 初始化完成，已注册事件监听');
        } else {
            this.destroy();
        }
    }

    onDestroy() {
        if (SaveManager._instance === this) {
            this._unregisterEventListeners();
            this._stopAutoSave();
            SaveManager._instance = null;
        }
    }

    // ==================== EventBus 事件监听 ====================

    /**
     * 注册事件监听 - 监听关键游戏事件标记脏数据
     */
    private _registerEventListeners(): void {
        eventBus.on(GameEvent.CROP_HARVESTED, this._onDataChanged, this);
        eventBus.on(GameEvent.GOLD_CHANGED, this._onDataChanged, this);
        eventBus.on(GameEvent.LEVEL_UP, this._onDataChanged, this);
        eventBus.on(GameEvent.ACHIEVEMENT_UNLOCKED, this._onDataChanged, this);
    }

    /**
     * 取消事件监听
     */
    private _unregisterEventListeners(): void {
        eventBus.off(GameEvent.CROP_HARVESTED, this._onDataChanged, this);
        eventBus.off(GameEvent.GOLD_CHANGED, this._onDataChanged, this);
        eventBus.off(GameEvent.LEVEL_UP, this._onDataChanged, this);
        eventBus.off(GameEvent.ACHIEVEMENT_UNLOCKED, this._onDataChanged, this);
    }

    /** 数据变更回调 - 标记需要存档 */
    private _onDataChanged(data: any): void {
        // 关键数据变更时自动存档（节流：距上次存档超过10秒才触发）
        if (!this._isSaving) {
            this.save();
        }
    }
    
    update(deltaTime: number) {
        // 更新游戏时长
        this._updatePlayTime(deltaTime);
    }
    
    /**
     * 获取存档列表信息
     */
    public getSaveList(): SaveData[] {
        const list: SaveData[] = [];
        for (let i = 0; i < 3; i++) {
            const metaKey = `farm_save_meta_${i}`;
            const metaStr = localStorage.getItem(metaKey);
            if (metaStr) {
                try {
                    list.push(JSON.parse(metaStr));
                } catch (e) {
                    list.push(null);
                }
            } else {
                list.push(null);
            }
        }
        return list;
    }

    /**
     * 获取单个存档槽位信息
     */
    public getSlotInfo(slot: number): SaveData | null {
        const metaKey = `farm_save_meta_${slot}`;
        const metaStr = localStorage.getItem(metaKey);
        if (metaStr) {
            try {
                return JSON.parse(metaStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    // ==================== 存档操作 ====================
    
    /**
     * 保存游戏
     * @param slot 存档槽位（0-2）
     */
    public async save(slot: number = this._currentSlot): Promise<boolean> {
        if (this._isSaving) {
            console.warn('[SaveManager] 正在存档中，请稍后');
            return false;
        }
        
        this._isSaving = true;
        this._eventTarget.emit('saveStart', { slot });
        
        try {
            const saveData = this._collectSaveData();
            const key = `farm_save_${slot}`;
            localStorage.setItem(key, JSON.stringify(saveData));
            
            // 保存存档元数据
            const metaData: SaveData = {
                version: this._version,
                saveTime: Date.now(),
                playerName: saveData.player?.name || '农场主',
                gameDays: saveData.gameDays || 0,
                totalPlayTime: saveData.totalPlayTime || 0,
            };
            localStorage.setItem(`${key}_meta`, JSON.stringify(metaData));
            
            this._currentSlot = slot;
            console.log(`[SaveManager] 存档已保存到槽位 ${slot}`);
            
            this._eventTarget.emit('saveComplete', { slot, success: true });
            eventBus.emit(GameEvent.GAME_SAVED, { slot, saveTime: metaData.saveTime });
            return true;
        } catch (e) {
            console.error('[SaveManager] 存档失败:', e);
            this._eventTarget.emit('saveComplete', { slot, success: false, error: e });
            return false;
        } finally {
            this._isSaving = false;
        }
    }
    
    /**
     * 加载游戏
     * @param slot 存档槽位（0-2）
     */
    public async load(slot: number = this._currentSlot): Promise<boolean> {
        try {
            const key = `farm_save_${slot}`;
            const dataStr = localStorage.getItem(key);
            
            if (!dataStr) {
                console.warn(`[SaveManager] 槽位 ${slot} 没有存档数据`);
                return false;
            }
            
            const saveData = JSON.parse(dataStr);
            
            // 版本检查
            if (saveData.version !== this._version) {
                console.warn(`[SaveManager] 存档版本不匹配: ${saveData.version} vs ${this._version}`);
                // 尝试迁移
                if (!this._migrateSaveData(saveData)) {
                    return false;
                }
            }
            
            this._applySaveData(saveData);
            this._currentSlot = slot;
            
            console.log(`[SaveManager] 已从槽位 ${slot} 加载存档`);
            this._eventTarget.emit('loadComplete', { slot, success: true });
            eventBus.emit(GameEvent.GAME_LOADED, { slot });
            return true;
        } catch (e) {
            console.error('[SaveManager] 读档失败:', e);
            this._eventTarget.emit('loadComplete', { slot, success: false, error: e });
            return false;
        }
    }
    
    /**
     * 检查存档是否存在
     */
    public hasSave(slot: number): boolean {
        return localStorage.getItem(`farm_save_${slot}`) !== null;
    }
    
    /**
     * 获取存档元数据
     */
    public getSaveMeta(slot: number): SaveData | null {
        const metaStr = localStorage.getItem(`farm_save_${slot}_meta`);
        if (metaStr) {
            try {
                return JSON.parse(metaStr);
            } catch (e) {
                console.error('[SaveManager] 解析存档元数据失败:', e);
            }
        }
        return null;
    }
    
    /**
     * 删除存档
     */
    public deleteSave(slot: number): boolean {
        if (!this.hasSave(slot)) {
            console.warn(`[SaveManager] 槽位 ${slot} 没有存档`);
            return false;
        }
        
        localStorage.removeItem(`farm_save_${slot}`);
        localStorage.removeItem(`farm_save_${slot}_meta`);
        console.log(`[SaveManager] 已删除槽位 ${slot} 的存档`);
        return true;
    }
    
    /**
     * 获取所有存档槽位信息
     */
    public getAllSaveSlots(): { slot: number; hasData: boolean; meta: SaveData | null }[] {
        const slots = [];
        for (let i = 0; i < 3; i++) {
            slots.push({
                slot: i,
                hasData: this.hasSave(i),
                meta: this.getSaveMeta(i),
            });
        }
        return slots;
    }
    
    /**
     * 获取当前存档槽位
     */
    public getCurrentSlot(): number {
        return this._currentSlot;
    }
    
    /**
     * 导出存档为字符串
     */
    public exportSave(slot: number = this._currentSlot): string | null {
        const key = `farm_save_${slot}`;
        const dataStr = localStorage.getItem(key);
        if (!dataStr) return null;
        
        // 简单的Base64编码
        try {
            return btoa(encodeURIComponent(dataStr));
        } catch (e) {
            console.error('[SaveManager] 导出存档失败:', e);
            return null;
        }
    }
    
    /**
     * 导入存档
     */
    public importSave(slot: number, exportStr: string): boolean {
        try {
            const dataStr = decodeURIComponent(atob(exportStr));
            const data = JSON.parse(dataStr);
            
            const key = `farm_save_${slot}`;
            localStorage.setItem(key, JSON.stringify(data));
            
            // 更新元数据
            const metaData: SaveData = {
                version: data.version,
                saveTime: Date.now(),
                playerName: data.player?.name || '农场主',
                gameDays: data.gameDays || 0,
                totalPlayTime: data.totalPlayTime || 0,
            };
            localStorage.setItem(`${key}_meta`, JSON.stringify(metaData));
            
            console.log(`[SaveManager] 已导入存档到槽位 ${slot}`);
            return true;
        } catch (e) {
            console.error('[SaveManager] 导入存档失败:', e);
            return false;
        }
    }
    
    // ==================== 自动存档 ====================
    
    /**
     * 设置自动存档间隔
     */
    public setAutoSaveInterval(intervalMs: number): void {
        this._autoSaveInterval = intervalMs;
        this._stopAutoSave();
        this._startAutoSave();
    }
    
    /**
     * 启用/禁用自动存档
     */
    public setAutoSaveEnabled(enabled: boolean): void {
        if (enabled) {
            this._startAutoSave();
        } else {
            this._stopAutoSave();
        }
    }
    
    // ==================== 事件监听 ====================
    
    public on(event: string, callback: (...args: any[]) => void, target?: any): void {
        this._eventTarget.on(event, callback, target);
    }
    
    public off(event: string, callback: (...args: any[]) => void, target?: any): void {
        this._eventTarget.off(event, callback, target);
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 收集存档数据
     */
    private _collectSaveData(): any {
        const data: any = {
            version: this._version,
            saveTime: Date.now(),
            totalPlayTime: this._getTotalPlayTime(),
            gameDays: this._getGameDays(),
        };
        
        // 收集货币系统数据
        const currency = CurrencySystem.getInstance();
        if (currency) {
            data.currency = {
                gold: currency.gold,
                diamond: currency.diamond,
            };
        }
        
        // 收集经验系统数据
        const expSystem = ExpSystem.getInstance();
        if (expSystem) {
            data.player = expSystem.getPlayerData();
        }
        
        // 收集仓库系统数据
        const warehouse = WarehouseManager.getInstance();
        if (warehouse) {
            data.warehouse = {
                items: warehouse.getAllItems(),
                totalValue: warehouse.getTotalValue(),
            };
        }
        
        // 收集任务系统数据
        const taskManager = TaskManager.getInstance();
        if (taskManager) {
            data.tasks = {
                all: taskManager.getAllTasks(),
                daily: taskManager.getDailyTasks(),
            };
        }
        
        // 收集成就系统数据
        const achievementManager = AchievementManager.getInstance();
        if (achievementManager) {
            data.achievements = {
                all: achievementManager.getAllAchievements(),
                stats: achievementManager.getAchievementStats(),
            };
        }

        // 收集农田作物数据
        const soil = this.node.scene.getComponentInChildren(Soil);
        if (soil) {
            data.crops = soil.getCropsSaveData();
            data.extendBrand = soil.getExtendBrandSaveData();
        }

        // 收集时间系统数据
        const timeSystem = TimeSystem.getInstance();
        if (timeSystem) {
            data.time = timeSystem.getSaveData();
        }

        // 收集天气系统数据
        const weatherSystem = WeatherSystem.getInstance();
        if (weatherSystem) {
            data.weather = weatherSystem.getSaveData();
        }

        // 收集好友系统数据
        const friendsSystem = FriendsSystem.getInstance();
        if (friendsSystem) {
            data.friends = friendsSystem.getSaveData();
        }

        // 收集新手引导数据
        const tutorialManager = TutorialManager.getInstance();
        if (tutorialManager) {
            data.tutorial = tutorialManager.getSaveData();
        }

        // 收集设置
        const settings = localStorage.getItem('farm_settings');
        if (settings) {
            data.settings = JSON.parse(settings);
        }
        
        return data;
    }
    
    /**
     * 应用存档数据 - 恢复所有系统状态
     */
    private _applySaveData(data: any): void {
        // 恢复货币系统
        if (data.currency) {
            const currency = CurrencySystem.getInstance();
            if (currency) {
                currency.setGold(data.currency.gold || 0);
            }
        }
        
        // 恢复经验系统
        if (data.player) {
            const expSystem = ExpSystem.getInstance();
            if (expSystem) {
                expSystem.setPlayerData(data.player);
            }
        }
        
        // 恢复仓库系统
        if (data.warehouse && data.warehouse.items) {
            const warehouse = WarehouseManager.getInstance();
            if (warehouse) {
                warehouse.setItems(data.warehouse.items);
            }
        }
        
        // 恢复任务系统
        if (data.tasks) {
            const taskManager = TaskManager.getInstance();
            if (taskManager) {
                taskManager.loadSaveData(data.tasks);
            }
        }
        
        // 恢复成就系统
        if (data.achievements) {
            const achievementManager = AchievementManager.getInstance();
            if (achievementManager) {
                achievementManager.loadSaveData(data.achievements);
            }
        }

        // 恢复农田作物
        if (data.crops && Array.isArray(data.crops)) {
            const soil = this.node.scene.getComponentInChildren(Soil);
            if (soil) {
                soil.restoreCropsFromSave(data.crops);
            }
        }

        // 恢复扩建牌位置
        if (data.extendBrand) {
            const soil = this.node.scene.getComponentInChildren(Soil);
            if (soil) {
                soil.restoreExtendBrandFromSave(data.extendBrand);
            }
        }

        // 恢复时间系统
        if (data.time) {
            const timeSystem = TimeSystem.getInstance();
            if (timeSystem) {
                timeSystem.restoreFromSave(data.time);
            }
        }

        // 恢复天气系统
        if (data.weather) {
            const weatherSystem = WeatherSystem.getInstance();
            if (weatherSystem) {
                weatherSystem.restoreFromSave(data.weather);
            }
        }

        // 恢复好友系统
        if (data.friends) {
            const friendsSystem = FriendsSystem.getInstance();
            if (friendsSystem) {
                friendsSystem.restoreFromSave(data.friends);
            }
        }

        // 恢复新手引导
        if (data.tutorial) {
            const tutorialManager = TutorialManager.getInstance();
            if (tutorialManager) {
                tutorialManager.restoreFromSave(data.tutorial);
            }
        }

        // 恢复设置
        if (data.settings) {
            localStorage.setItem('farm_settings', JSON.stringify(data.settings));
        }
    }
    
    /**
     * 存档数据迁移
     */
    private _migrateSaveData(data: any): boolean {
        if (!data.version) {
            data.version = '1.0.0';
        }
        console.log('[SaveManager] 存档数据已迁移到最新版本');
        return true;
    }
    
    /**
     * 获取总游戏时长（秒）
     */
    private _getTotalPlayTime(): number {
        return parseInt(localStorage.getItem('farm_total_playtime') || '0');
    }
    
    /**
     * 获取游戏天数
     */
    private _getGameDays(): number {
        return parseInt(localStorage.getItem('farm_game_days') || '1');
    }
    
    /**
     * 更新游戏时长
     */
    private _updatePlayTime(deltaTime: number): void {
        const key = 'farm_total_playtime';
        const current = parseInt(localStorage.getItem(key) || '0');
        localStorage.setItem(key, (current + deltaTime).toString());
    }
    
    /**
     * 开始自动存档
     */
    private _startAutoSave(): void {
        this._stopAutoSave();
        this._autoSaveTimer = window.setInterval(() => {
            this.save();
        }, this._autoSaveInterval);
        console.log('[SaveManager] 自动存档已启用');
    }
    
    /**
     * 停止自动存档
     */
    private _stopAutoSave(): void {
        if (this._autoSaveTimer) {
            clearInterval(this._autoSaveTimer);
            this._autoSaveTimer = 0;
        }
    }
}
