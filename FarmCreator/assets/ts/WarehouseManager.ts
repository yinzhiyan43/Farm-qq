import { _decorator, Component, game, find, Node, Layers } from 'cc';
import { eventBus, GameEvent } from './EventBus';
const { ccclass, property } = _decorator;

/**
 * 仓库物品数据
 */
export interface WarehouseItem {
    /** 作物ID */
    cropId: number;
    /** 作物名称 */
    cropName: string;
    /** 数量 */
    count: number;
    /** 单价 */
    sellPrice: number;
}

/**
 * 仓库管理器 - 管理收获的作物
 * 支持存入、出售、查询等功能
 * 自动持久化到本地存储
 */
@ccclass('WarehouseManager')
export class WarehouseManager extends Component {
    private static _instance: WarehouseManager = null;
    
    /** 仓库物品列表 */
    private _items: Map<number, WarehouseItem> = new Map();
    
    /** 存储键名 */
    private readonly WAREHOUSE_KEY = 'farm_warehouse';
    
    public static getInstance(): WarehouseManager {
        // 如果实例不存在，尝试自动创建
        if (!WarehouseManager._instance) {
            WarehouseManager.ensureInstance();
        }
        return WarehouseManager._instance;
    }

    /**
     * 确保WarehouseManager实例存在（自动创建）
     */
    public static ensureInstance(): boolean {
        if (WarehouseManager._instance) {
            return true;
        }

        console.log('[WarehouseManager] 自动创建WarehouseManager节点');

        // 获取当前场景的Canvas作为parent
        const canvas = find('Canvas');
        if (!canvas) {
            console.warn('[WarehouseManager] 找不到Canvas节点');
            return false;
        }

        // 创建WarehouseManager节点
        const warehouseNode = new Node('WarehouseManager');
        warehouseNode.layer = Layers.Enum.UI_2D;
        warehouseNode.parent = canvas;

        // 添加WarehouseManager组件（这会触发onLoad）
        warehouseNode.addComponent(WarehouseManager);
        
        console.log('[WarehouseManager] WarehouseManager节点创建完成');

        return WarehouseManager._instance !== null;
    }
    
    onLoad() {
        if (WarehouseManager._instance === null) {
            WarehouseManager._instance = this;
            game.addPersistRootNode(this.node);
            this.loadWarehouse();
        } else if (WarehouseManager._instance !== this) {
            // 只有当实例不是当前组件时才销毁
            this.destroy();
        }
    }
    
    /**
     * 获取所有仓库物品
     */
    public getAllItems(): WarehouseItem[] {
        return Array.from(this._items.values());
    }
    
    /**
     * 获取指定作物的数量
     * @param cropId 作物ID
     */
    public getItemCount(cropId: number): number {
        const item = this._items.get(cropId);
        return item ? item.count : 0;
    }
    
    /**
     * 获取仓库物品总数
     */
    public getTotalItemCount(): number {
        let total = 0;
        for (const item of this._items.values()) {
            total += item.count;
        }
        return total;
    }
    
    /**
     * 存入作物
     * @param cropId 作物ID
     * @param cropName 作物名称
     * @param sellPrice 售卖价格
     * @param count 数量（默认1）
     * @returns 存入后的总数量
     */
    public storeCrop(cropId: number, cropName: string, sellPrice: number, count: number = 1): number {
        if (count <= 0) {
            console.warn('[WarehouseManager] 存入数量必须大于0');
            return 0;
        }
        
        let item = this._items.get(cropId);
        if (item) {
            item.count += count;
        } else {
            item = {
                cropId: cropId,
                cropName: cropName,
                count: count,
                sellPrice: sellPrice
            };
            this._items.set(cropId, item);
        }
        
        this.saveWarehouse();
        this.emitWarehouseChanged();
        console.log(`[WarehouseManager] 存入作物: ${cropName} x${count}, 当前总数: ${item.count}`);
        return item.count;
    }
    
    /**
     * 出售作物
     * @param cropId 作物ID
     * @param count 数量（默认1，-1表示全部出售）
     * @returns 出售获得的金额，失败返回0
     */
    public sellCrop(cropId: number, count: number = 1): number {
        const item = this._items.get(cropId);
        if (!item) {
            console.warn(`[WarehouseManager] 仓库中没有该作物: ${cropId}`);
            return 0;
        }
        
        // -1 表示全部出售
        if (count === -1) {
            count = item.count;
        }
        
        if (count <= 0) {
            console.warn('[WarehouseManager] 出售数量必须大于0');
            return 0;
        }
        
        if (item.count < count) {
            console.warn(`[WarehouseManager] 作物数量不足: 需要${count}, 拥有${item.count}`);
            return 0;
        }
        
        const earnings = count * item.sellPrice;
        item.count -= count;
        
        // 如果数量为0，删除该物品
        if (item.count === 0) {
            this._items.delete(cropId);
        }
        
        this.saveWarehouse();
        this.emitWarehouseChanged();
        eventBus.emit(GameEvent.WAREHOUSE_SOLD, {
            cropId: cropId,
            cropName: item.cropName,
            count: count,
            earnings: earnings,
        });
        console.log(`[WarehouseManager] 出售作物: ${item.cropName} x${count}, 获得金币: ${earnings}`);
        return earnings;
    }
    
    /**
     * 全部出售
     * @returns 总收益
     */
    public sellAll(): number {
        let totalEarnings = 0;
        const itemsToSell = Array.from(this._items.entries());
        
        for (const [cropId, item] of itemsToSell) {
            totalEarnings += item.count * item.sellPrice;
            console.log(`[WarehouseManager] 出售作物: ${item.cropName} x${item.count}, 获得金币: ${item.count * item.sellPrice}`);
        }
        
        this._items.clear();
        this.saveWarehouse();
        this.emitWarehouseChanged();
        eventBus.emit(GameEvent.WAREHOUSE_SOLD, {
            cropId: 0,
            cropName: '全部作物',
            count: itemsToSell.length,
            earnings: totalEarnings,
        });
        console.log(`[WarehouseManager] 全部出售完成, 总收益: ${totalEarnings}`);
        return totalEarnings;
    }
    
    /**
     * 检查是否有该作物
     * @param cropId 作物ID
     */
    public hasCrop(cropId: number): boolean {
        const item = this._items.get(cropId);
        return item !== undefined && item.count > 0;
    }
    
    /**
     * 获取仓库价值（所有物品总价值）
     */
    public getTotalValue(): number {
        let total = 0;
        for (const item of this._items.values()) {
            total += item.count * item.sellPrice;
        }
        return total;
    }
    
    /**
     * 设置仓库物品（用于存档恢复）
     * @param items 仓库物品列表
     */
    public setItems(items: WarehouseItem[]): void {
        this._items.clear();
        for (const item of items) {
            this._items.set(item.cropId, item);
        }
        this.saveWarehouse();
        this.emitWarehouseChanged();
        console.log(`[WarehouseManager] 恢复仓库: ${items.length} 种作物`);
    }

    /**
     * 清空仓库（用于测试或新游戏）
     */
    public clear(): void {
        this._items.clear();
        this.saveWarehouse();
        this.emitWarehouseChanged();
        console.log('[WarehouseManager] 仓库已清空');
    }
    
    /**
     * 保存到本地存储
     */
    private saveWarehouse(): void {
        try {
            const data = Array.from(this._items.values());
            localStorage.setItem(this.WAREHOUSE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('[WarehouseManager] 保存仓库失败:', error);
        }
    }
    
    /**
     * 从本地存储加载
     */
    private loadWarehouse(): void {
        try {
            const dataStr = localStorage.getItem(this.WAREHOUSE_KEY);
            if (dataStr) {
                const data: WarehouseItem[] = JSON.parse(dataStr);
                for (const item of data) {
                    this._items.set(item.cropId, item);
                }
                console.log(`[WarehouseManager] 加载仓库: ${data.length} 种作物, 总数量: ${this.getTotalItemCount()}`);
            } else {
                console.log('[WarehouseManager] 仓库为空');
            }
        } catch (error) {
            console.error('[WarehouseManager] 加载仓库失败:', error);
            this._items.clear();
        }
    }
    
    /**
     * 触发仓库变化事件
     */
    private emitWarehouseChanged(): void {
        // 通过EventBus全局发布
        eventBus.emit(GameEvent.WAREHOUSE_CHANGED, { items: this.getAllItems(), totalValue: this.getTotalValue() });
    }
}
