import { _decorator, Component, game, find, Node, Layers } from 'cc';
import { eventBus, GameEvent } from './EventBus';
const { ccclass, property } = _decorator;

/**
 * 货币系统 - 管理游戏中的金币和货币
 * 支持增加、消费、查询余额等操作
 * 自动持久化到本地存储
 */
@ccclass('CurrencySystem')
export class CurrencySystem extends Component {
    private static _instance: CurrencySystem = null;
    
    /** 金币数量 */
    private _gold: number = 0;

    /** 钻石数量（高级货币） */
    private _diamond: number = 0;

    /** 累计获得的金币（用于成就追踪） */
    private _totalGoldEarned: number = 0;
    
    /** 存储键名 */
    private readonly GOLD_KEY = 'farm_gold';
    private readonly DIAMOND_KEY = 'farm_diamond';
    
    /** 初始金币数量 */
    private readonly INITIAL_GOLD = 100;
    
    public static getInstance(): CurrencySystem {
        // 如果实例不存在，尝试自动创建
        if (!CurrencySystem._instance) {
            CurrencySystem.ensureInstance();
        }
        return CurrencySystem._instance;
    }

    /**
     * 确保CurrencySystem实例存在（自动创建）
     */
    public static ensureInstance(): boolean {
        if (CurrencySystem._instance) {
            return true;
        }

        console.log('[CurrencySystem] 自动创建CurrencySystem节点');

        // 获取当前场景的Canvas作为parent
        const canvas = find('Canvas');
        if (!canvas) {
            console.warn('[CurrencySystem] 找不到Canvas节点');
            return false;
        }

        // 创建CurrencySystem节点
        const currencyNode = new Node('CurrencySystem');
        currencyNode.layer = Layers.Enum.UI_2D;
        currencyNode.parent = canvas;

        // 添加CurrencySystem组件（这会触发onLoad）
        currencyNode.addComponent(CurrencySystem);
        
        console.log('[CurrencySystem] CurrencySystem节点创建完成');

        return CurrencySystem._instance !== null;
    }
    
    onLoad() {
        if (CurrencySystem._instance === null) {
            CurrencySystem._instance = this;
            this.loadCurrency();
        } else if (CurrencySystem._instance !== this) {
            // 只有当实例不是当前组件时才销毁
            this.destroy();
        }
    }
    
    /**
     * 获取当前金币数量
     */
    public get gold(): number {
        return this._gold;
    }
    
    /**
     * 获取当前钻石数量
     */
    public get diamond(): number {
        return this._diamond;
    }
    
    /**
     * 增加金币
     * @param amount 增加数量
     * @returns 增加后的金币总数
     */
    public addGold(amount: number): number {
        if (amount <= 0) {
            console.warn('[CurrencySystem] 增加金币数量必须大于0');
            return this._gold;
        }
        
        this._gold += amount;
        this._totalGoldEarned += amount;
        this.saveCurrency();
        this.emitGoldChanged();
        console.log(`[CurrencySystem] 增加金币: +${amount}, 当前: ${this._gold}`);
        return this._gold;
    }
    
    /**
     * 消费金币
     * @param amount 消费数量
     * @returns 是否消费成功
     */
    public spendGold(amount: number): boolean {
        if (amount <= 0) {
            console.warn('[CurrencySystem] 消费金币数量必须大于0');
            return false;
        }
        
        if (this._gold < amount) {
            console.warn(`[CurrencySystem] 金币不足: 需要${amount}, 拥有${this._gold}`);
            return false;
        }
        
        this._gold -= amount;
        this.saveCurrency();
        this.emitGoldChanged();
        console.log(`[CurrencySystem] 消费金币: -${amount}, 当前: ${this._gold}`);
        return true;
    }
    
    /**
     * 检查是否赔付得起
     * @param amount 需要的金币数量
     * @returns 是否赔付得起
     */
    public canAfford(amount: number): boolean {
        return this._gold >= amount;
    }
    
    /**
     * 增加钻石
     * @param amount 增加数量
     */
    public addDiamond(amount: number): number {
        if (amount <= 0) {
            console.warn('[CurrencySystem] 增加钻石数量必须大于0');
            return this._diamond;
        }
        
        this._diamond += amount;
        this.saveCurrency();
        console.log(`[CurrencySystem] 增加钻石: +${amount}, 当前: ${this._diamond}`);
        return this._diamond;
    }
    
    /**
     * 消费钻石
     * @param amount 消费数量
     * @returns 是否消费成功
     */
    public spendDiamond(amount: number): boolean {
        if (amount <= 0) {
            console.warn('[CurrencySystem] 消费钻石数量必须大于0');
            return false;
        }
        
        if (this._diamond < amount) {
            console.warn(`[CurrencySystem] 钻石不足: 需要${amount}, 拥有${this._diamond}`);
            return false;
        }
        
        this._diamond -= amount;
        this.saveCurrency();
        console.log(`[CurrencySystem] 消费钻石: -${amount}, 当前: ${this._diamond}`);
        return true;
    }
    
    /**
     * 设置金币数量（用于存档恢复）
     * @param amount 目标金币数量
     */
    public setGold(amount: number): void {
        this._gold = Math.max(0, amount);
        this.saveCurrency();
        this.emitGoldChanged();
        console.log(`[CurrencySystem] 设置金币: ${this._gold}`);
    }

    /**
     * 重置货币（用于测试或新游戏）
     */
    public reset(): void {
        this._gold = this.INITIAL_GOLD;
        this._diamond = 0;
        this.saveCurrency();
        this.emitGoldChanged();
        console.log('[CurrencySystem] 货币已重置');
    }
    
    /**
     * 保存货币到本地存储
     */
    private saveCurrency(): void {
        try {
            localStorage.setItem(this.GOLD_KEY, this._gold.toString());
            localStorage.setItem(this.DIAMOND_KEY, this._diamond.toString());
            localStorage.setItem('farm_total_gold_earned', this._totalGoldEarned.toString());
        } catch (error) {
            console.error('[CurrencySystem] 保存货币失败:', error);
        }
    }

    /**
     * 从本地存储加载货币
     */
    private loadCurrency(): void {
        try {
            const goldStr = localStorage.getItem(this.GOLD_KEY);
            const diamondStr = localStorage.getItem(this.DIAMOND_KEY);
            const totalGoldStr = localStorage.getItem('farm_total_gold_earned');

            if (goldStr !== null) {
                this._gold = parseInt(goldStr, 10) || 0;
            } else {
                // 首次游戏，给予初始金币
                this._gold = this.INITIAL_GOLD;
                this.saveCurrency();
            }

            if (diamondStr !== null) {
                this._diamond = parseInt(diamondStr, 10) || 0;
            }

            if (totalGoldStr !== null) {
                this._totalGoldEarned = parseInt(totalGoldStr, 10) || 0;
            }

            console.log(`[CurrencySystem] 加载货币: 金币=${this._gold}, 钻石=${this._diamond}, 累计获得=${this._totalGoldEarned}`);
        } catch (error) {
            console.error('[CurrencySystem] 加载货币失败:', error);
            this._gold = this.INITIAL_GOLD;
            this._diamond = 0;
            this._totalGoldEarned = 0;
        }
    }
    
    /**
     * 触发金币变化事件
     */
    private emitGoldChanged(): void {
        // 通过节点事件发布（向后兼容）
        this.node.emit('gold-changed', this._gold);
        // 通过EventBus全局发布
        eventBus.emit(GameEvent.GOLD_CHANGED, { gold: this._gold, total: this._totalGoldEarned });
    }
}
