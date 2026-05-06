import { _decorator, Component, Node, UITransform, UIOpacity, Label, Color, Vec3, Size, tween, Tween } from 'cc';
import { eventBus, GameEvent } from './EventBus';

const { ccclass, property } = _decorator;

/**
 * 对象池 - 复用频繁创建销毁的节点，减少GC压力
 *
 * 池化类型：
 * - CoinFly: 收获金币文字
 * - ToastText: 提示文字
 * - MatureIndicator: 成熟指示器
 * - Generic: 通用节点
 */
class PoolBucket {
    private pool: Node[] = [];
    private factory: () => Node;
    private resetFn: (node: Node) => void;
    private maxSize: number;

    constructor(factory: () => Node, resetFn: (node: Node) => void, maxSize: number = 20) {
        this.factory = factory;
        this.resetFn = resetFn;
        this.maxSize = maxSize;
    }

    /** 从池中获取一个节点，如果池空则新建 */
    get(): Node {
        if (this.pool.length > 0) {
            const node = this.pool.pop()!;
            node.active = true;
            this.resetFn(node);
            return node;
        }
        return this.factory();
    }

    /** 归还节点到池中 */
    put(node: Node) {
        if (!node || !node.isValid) return;
        if (this.pool.length >= this.maxSize) {
            node.destroy();
            return;
        }
        node.active = false;
        node.removeFromParent();
        this.pool.push(node);
    }

    /** 清空池 */
    clear() {
        for (const node of this.pool) {
            if (node.isValid) node.destroy();
        }
        this.pool.length = 0;
    }

    get size(): number {
        return this.pool.length;
    }
}

/**
 * 性能优化系统 v1.0
 *
 * 职责：
 * - 对象池管理（金币文字、Toast、指示器等频繁创建/销毁的节点）
 * - 批量操作优化（统一更新所有作物、减少逐帧操作）
 * - 帧率监控与自适应降级
 * - 帧更新频率控制（非每帧更新的系统使用分帧策略）
 *
 * 挂在 Canvas 下，自动初始化。
 */
@ccclass('PerformanceSystem')
export class PerformanceSystem extends Component {
    private static _instance: PerformanceSystem = null;

    // 对象池集合
    private pools: Map<string, PoolBucket> = new Map();

    // 帧率监控
    private frameCount: number = 0;
    private fpsAccumulator: number = 0;
    private currentFPS: number = 60;
    private lastFpsCheckTime: number = 0;
    private readonly FPS_CHECK_INTERVAL = 1.0; // 每秒检查一次FPS

    // 自适应降级阈值
    private readonly FPS_WARNING = 30;
    private readonly FPS_CRITICAL = 20;
    private lowFPSSustained: number = 0; // 连续低FPS帧数
    private isPerformanceMode: boolean = false;

    // 分帧更新
    private updateGroups: Map<string, { interval: number; elapsed: number; callback: () => void }> = new Map();

    // ==================== 单例 ====================

    public static getInstance(): PerformanceSystem | null {
        return PerformanceSystem._instance;
    }

    // ==================== 生命周期 ====================

    onLoad() {
        if (PerformanceSystem._instance && PerformanceSystem._instance !== this) {
            this.node.destroy();
            return;
        }
        PerformanceSystem._instance = this;
        this.initPools();
        this.lastFpsCheckTime = Date.now() / 1000;
        console.log('[PerformanceSystem] 初始化完成');
    }

    onDestroy() {
        for (const [, bucket] of this.pools) {
            bucket.clear();
        }
        this.pools.clear();
        this.updateGroups.clear();
        if (PerformanceSystem._instance === this) {
            PerformanceSystem._instance = null;
        }
    }

    // ==================== 帧更新 ====================

    update(dt: number) {
        this.frameCount++;
        this.fpsAccumulator += dt;

        // FPS检测
        if (this.fpsAccumulator >= this.FPS_CHECK_INTERVAL) {
            this.currentFPS = Math.round(this.frameCount / this.fpsAccumulator);
            this.frameCount = 0;
            this.fpsAccumulator = 0;
            this.onFPSMeasured(this.currentFPS);
        }

        // 分帧更新调度
        for (const [, group] of this.updateGroups) {
            group.elapsed += dt;
            if (group.elapsed >= group.interval) {
                group.elapsed = 0;
                group.callback();
            }
        }
    }

    // ==================== FPS监控 & 自适应降级 ====================

    private onFPSMeasured(fps: number) {
        if (fps < this.FPS_WARNING) {
            this.lowFPSSustained++;
            if (this.lowFPSSustained >= 3 && !this.isPerformanceMode) {
                this.enablePerformanceMode();
            }
        } else {
            if (this.lowFPSSustained > 0) {
                this.lowFPSSustained--;
            }
            if (this.lowFPSSustained === 0 && this.isPerformanceMode) {
                this.disablePerformanceMode();
            }
        }
    }

    /**
     * 启用性能模式 — 降低动画频率、减少粒子效果
     */
    private enablePerformanceMode() {
        this.isPerformanceMode = true;
        eventBus.emit(GameEvent.PERFORMANCE_MODE_CHANGED, { mode: 'performance' });
        console.log('[PerformanceSystem] 启用性能模式（FPS过低）');
    }

    /**
     * 恢复品质模式
     */
    private disablePerformanceMode() {
        this.isPerformanceMode = false;
        eventBus.emit(GameEvent.PERFORMANCE_MODE_CHANGED, { mode: 'quality' });
        console.log('[PerformanceSystem] 恢复品质模式');
    }

    /**
     * 当前是否处于性能模式
     */
    public isLowPerformanceMode(): boolean {
        return this.isPerformanceMode;
    }

    /**
     * 获取当前FPS
     */
    public getFPS(): number {
        return this.currentFPS;
    }

    // ==================== 对象池 ====================

    /**
     * 初始化各类对象池
     */
    private initPools() {
        // 金币文字池
        this.pools.set('CoinFly', new PoolBucket(
            () => {
                const node = new Node('CoinFly');
                const uit = node.addComponent(UITransform);
                uit.setContentSize(120, 30);
                const label = node.addComponent(Label);
                label.fontSize = 22;
                label.color = new Color(255, 215, 0, 255);
                label.horizontalAlign = Label.HorizontalAlign.CENTER;
                node.addComponent(UIOpacity);
                return node;
            },
            (node) => {
                const label = node.getComponent(Label);
                if (label) label.string = '';
                const opacity = node.getComponent(UIOpacity);
                if (opacity) opacity.opacity = 255;
                node.setPosition(0, 0, 0);
                node.setScale(1, 1, 1);
            },
            15
        ));

        // Toast文字池
        this.pools.set('ToastText', new PoolBucket(
            () => {
                const node = new Node('ToastText');
                const uit = node.addComponent(UITransform);
                uit.setContentSize(300, 40);
                const label = node.addComponent(Label);
                label.fontSize = 18;
                label.color = new Color(255, 255, 255, 255);
                label.horizontalAlign = Label.HorizontalAlign.CENTER;
                label.overflow = Label.Overflow.CLAMP;
                node.addComponent(UIOpacity);
                return node;
            },
            (node) => {
                const label = node.getComponent(Label);
                if (label) label.string = '';
                const opacity = node.getComponent(UIOpacity);
                if (opacity) opacity.opacity = 255;
            },
            10
        ));

        // 成熟指示器池
        this.pools.set('MatureIndicator', new PoolBucket(
            () => {
                const node = new Node('MatureIndicator');
                const uit = node.addComponent(UITransform);
                uit.setContentSize(20, 20);
                node.addComponent(UIOpacity);
                return node;
            },
            (node) => {
                const opacity = node.getComponent(UIOpacity);
                if (opacity) opacity.opacity = 255;
                node.angle = 0;
            },
            20
        ));
    }

    /**
     * 从指定池获取节点
     */
    public getFromPool(poolName: string): Node | null {
        const bucket = this.pools.get(poolName);
        if (!bucket) {
            console.warn(`[PerformanceSystem] 对象池 "${poolName}" 不存在`);
            return null;
        }
        return bucket.get();
    }

    /**
     * 归还节点到指定池
     */
    public returnToPool(poolName: string, node: Node) {
        const bucket = this.pools.get(poolName);
        if (!bucket) {
            if (node?.isValid) node.destroy();
            return;
        }
        // 先停止该节点上的所有tween
        Tween.stopAllByTarget(node);
        const opacity = node.getComponent(UIOpacity);
        if (opacity) Tween.stopAllByTarget(opacity);
        bucket.put(node);
    }

    /**
     * 获取池状态信息（调试用）
     */
    public getPoolStats(): { [key: string]: number } {
        const stats: { [key: string]: number } = {};
        for (const [name, bucket] of this.pools) {
            stats[name] = bucket.size;
        }
        return stats;
    }

    // ==================== 分帧更新 ====================

    /**
     * 注册分帧更新组
     * @param name 组名
     * @param interval 更新间隔（秒），如0.2表示每0.2秒执行一次
     * @param callback 更新回调
     */
    public registerUpdateGroup(name: string, interval: number, callback: () => void) {
        this.updateGroups.set(name, { interval, elapsed: 0, callback });
    }

    /**
     * 取消分帧更新组
     */
    public unregisterUpdateGroup(name: string) {
        this.updateGroups.delete(name);
    }

    // ==================== 批量操作优化 ====================

    /**
     * 分批执行任务（避免单帧卡顿）
     * @param items 待处理项目数组
     * @param processFn 处理函数
     * @param itemsPerFrame 每帧处理数量
     * @param onComplete 全部完成回调
     */
    public batchProcess<T>(
        items: T[],
        processFn: (item: T, index: number) => void,
        itemsPerFrame: number = 5,
        onComplete?: () => void
    ) {
        let currentIndex = 0;

        const processBatch = () => {
            const endIndex = Math.min(currentIndex + itemsPerFrame, items.length);
            for (let i = currentIndex; i < endIndex; i++) {
                processFn(items[i], i);
            }
            currentIndex = endIndex;

            if (currentIndex < items.length) {
                this.scheduleOnce(processBatch, 0);
            } else {
                if (onComplete) onComplete();
            }
        };

        processBatch();
    }

    // ==================== 内存监控 ====================

    /**
     * 获取性能报告（调试用）
     */
    public getPerformanceReport(): string {
        const poolStats = this.getPoolStats();
        const poolInfo = Object.entries(poolStats).map(([k, v]) => `${k}:${v}`).join(', ');
        return `FPS: ${this.currentFPS} | 性能模式: ${this.isPerformanceMode ? 'ON' : 'OFF'} | 对象池: [${poolInfo}]`;
    }
}
