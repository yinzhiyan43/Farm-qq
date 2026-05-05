import { _decorator, Component, Node, Vec3, UITransform, UIOpacity, tween, Tween, Label, Color } from 'cc';
import { eventBus, GameEvent } from './EventBus';
import { PerformanceSystem } from './PerformanceSystem';

const { ccclass, property } = _decorator;

/**
 * 动画系统 v1.0
 *
 * 职责：
 * - 作物摇摆动画（成熟时）
 * - 收获特效动画（金币飞出文字）
 * - UI过渡动画（面板弹入/弹出、淡入淡出）
 * - 通用缓动工具方法（按钮脉冲、抖动）
 *
 * 所有动画通过EventBus事件驱动，无需手动调用。
 * AnimationSystem 自身也是单例，挂在 Canvas 下即可。
 */
@ccclass('AnimationSystem')
export class AnimationSystem extends Component {
    private static _instance: AnimationSystem = null;

    // 缓存活跃的Tween，便于统一管理
    private activeTweens: Map<string, Tween<any>> = new Map();

    // 动画参数
    private readonly SWING_DURATION = 0.6;
    private readonly SWING_ANGLE = 8;
    private readonly COIN_FLY_DURATION = 0.8;
    private readonly POPUP_DURATION = 0.2;
    private readonly FADE_DURATION = 0.25;
    private readonly TOAST_DURATION = 2.0;

    // 金币飞行目标位置（左上角金币HUD位置，可由外部设置）
    private goldHudPosition: Vec3 = new Vec3(-250, 350, 0);

    public static getInstance(): AnimationSystem | null {
        return AnimationSystem._instance;
    }

    // ==================== 生命周期 ====================

    onLoad() {
        if (AnimationSystem._instance && AnimationSystem._instance !== this) {
            this.node.destroy();
            return;
        }
        AnimationSystem._instance = this;
        this.registerEvents();
        console.log('[AnimationSystem] 初始化完成');
    }

    onDestroy() {
        this.unregisterEvents();
        this.stopAllTweens();
        if (AnimationSystem._instance === this) {
            AnimationSystem._instance = null;
        }
    }

    // ==================== 事件注册 ====================

    private registerEvents() {
        eventBus.on(GameEvent.CROP_MATURED, this.onCropMatured, this);
        eventBus.on(GameEvent.CROP_HARVESTED, this.onCropHarvested, this);
        eventBus.on(GameEvent.CROP_PLANTED, this.onCropPlanted, this);
        eventBus.on(GameEvent.ACHIEVEMENT_UNLOCKED, this.onAchievementUnlocked, this);
        eventBus.on(GameEvent.GOLD_CHANGED, this.onGoldChanged, this);
        eventBus.on(GameEvent.EXP_GAINED, this.onExpGained, this);
    }

    private unregisterEvents() {
        eventBus.off(GameEvent.CROP_MATURED, this.onCropMatured, this);
        eventBus.off(GameEvent.CROP_HARVESTED, this.onCropHarvested, this);
        eventBus.off(GameEvent.CROP_PLANTED, this.onCropPlanted, this);
        eventBus.off(GameEvent.ACHIEVEMENT_UNLOCKED, this.onAchievementUnlocked, this);
        eventBus.off(GameEvent.GOLD_CHANGED, this.onGoldChanged, this);
        eventBus.off(GameEvent.EXP_GAINED, this.onExpGained, this);
    }

    // ==================== 事件回调 ====================

    private onCropMatured(data: any) {
        if (!data?.position) return;
        // 成熟时在作物上方显示浮动指示器
        this.playMatureIndicator(data.position.x, data.position.y);
    }

    private onCropHarvested(data: any) {
        if (!data?.position) return;
        // 收获时金币文字飞出
        this.playCoinFlyEffect(data.position.x, data.position.y, data.sellPrice || 0);
    }

    private onCropPlanted(data: any) {
        if (!data?.position) return;
        // 种植弹跳
        this.playPlantBounce(data.position.x, data.position.y);
    }

    private onAchievementUnlocked(data: any) {
        this.playAchievementFlash();
    }

    private onGoldChanged(data: any) {
        eventBus.emit(GameEvent.ANIMATION_GOLD_BOUNCE);
    }

    private onExpGained(data: any) {
        eventBus.emit(GameEvent.ANIMATION_EXP_BOUNCE);
    }

    // ==================== 作物动画 ====================

    /**
     * 成熟指示动画 — 从对象池获取MatureIndicator节点，上下浮动闪烁
     */
    public playMatureIndicator(worldX: number, worldY: number) {
        const perf = PerformanceSystem.getInstance();
        const indicator = perf ? perf.getFromPool('MatureIndicator') : null;
        if (!indicator) return;

        const startY = worldY + 40;
        indicator.setPosition(worldX, startY, 0);
        this.node.addChild(indicator);

        // 上下浮动
        tween(indicator)
            .repeatForever(
                tween(indicator)
                    .to(0.5, { position: new Vec3(worldX, worldY + 52, 0) }, { easing: 'sineInOut' })
                    .to(0.5, { position: new Vec3(worldX, startY, 0) }, { easing: 'sineInOut' })
            )
            .start();

        // 闪烁
        const opacityComp = indicator.getComponent(UIOpacity)!;
        tween(opacityComp)
            .repeatForever(
                tween(opacityComp)
                    .to(0.4, { opacity: 255 })
                    .to(0.4, { opacity: 80 })
            )
            .start();

        // 5秒后归还池
        this.scheduleOnce(() => {
            if (indicator.isValid) {
                tween(indicator).stop();
                if (perf) perf.returnToPool('MatureIndicator', indicator);
            }
        }, 5);
    }

    /**
     * 种植弹跳 — 通知作物节点播放弹跳（由CropNode/Soil自行处理位置映射）
     */
    public playPlantBounce(tileX: number, tileY: number) {
        eventBus.emit(GameEvent.ANIMATION_PLANT_BOUNCE, { x: tileX, y: tileY });
    }

    /**
     * 收获金币飞出特效 — 从对象池获取CoinFly节点，播放飞行动画后归还
     */
    public playCoinFlyEffect(fromX: number, fromY: number, amount: number) {
        if (amount <= 0) return;

        // 从PerformanceSystem对象池获取CoinFly节点
        const perf = PerformanceSystem.getInstance();
        const coinNode = perf ? perf.getFromPool('CoinFly') : null;
        if (!coinNode) return;

        // 设置Label文字
        const label = coinNode.getComponent(Label);
        if (label) {
            label.string = `+${amount}`;
        }
        coinNode.setPosition(fromX, fromY + 30, 0);
        const opacity = coinNode.getComponent(UIOpacity);
        if (opacity) opacity.opacity = 255;
        this.node.addChild(coinNode);

        // 飞向HUD + 淡出 + 归还池
        tween(coinNode)
            .to(this.COIN_FLY_DURATION, {
                position: this.goldHudPosition.clone(),
            }, { easing: 'sineIn' })
            .call(() => {
                tween(opacity!)
                    .to(0.2, { opacity: 0 })
                    .call(() => {
                        if (perf) perf.returnToPool('CoinFly', coinNode);
                    })
                    .start();
            })
            .start();

        // 安全清理（防tween中断）
        this.scheduleOnce(() => {
            if (coinNode.isValid && coinNode.parent) {
                if (perf) perf.returnToPool('CoinFly', coinNode);
            }
        }, this.COIN_FLY_DURATION + 1);
    }

    /**
     * 开始作物摇摆（用于成熟作物持续摇摆提示）
     */
    public startCropSwing(cropNode: Node) {
        if (!cropNode?.isValid) return;
        const key = `swing_${cropNode.uuid}`;
        // 先停止旧的
        this.stopCropSwing(cropNode);

        const t = tween(cropNode)
            .repeatForever(
                tween(cropNode)
                    .to(this.SWING_DURATION / 2, { angle: this.SWING_ANGLE }, { easing: 'sineInOut' })
                    .to(this.SWING_DURATION / 2, { angle: -this.SWING_ANGLE }, { easing: 'sineInOut' })
            );
        t.start();
        this.activeTweens.set(key, t);
    }

    /**
     * 停止作物摇摆
     */
    public stopCropSwing(cropNode: Node) {
        if (!cropNode) return;
        const key = `swing_${cropNode.uuid}`;
        const t = this.activeTweens.get(key);
        if (t) {
            t.stop();
            this.activeTweens.delete(key);
        }
        if (cropNode.isValid) {
            cropNode.angle = 0;
        }
    }

    // ==================== HUD 动画 ====================

    /**
     * 成就解锁全屏闪光
     */
    public playAchievementFlash() {
        const flashNode = new Node('AchievementFlash');
        const uit = flashNode.addComponent(UITransform);
        uit.setContentSize(2000, 2000);
        flashNode.setPosition(0, 0, 500);
        const opacity = flashNode.addComponent(UIOpacity);
        opacity.opacity = 0;
        this.node.addChild(flashNode);

        tween(opacity)
            .to(0.15, { opacity: 100 })
            .to(0.3, { opacity: 0 })
            .call(() => { if (flashNode.isValid) flashNode.destroy(); })
            .start();
    }

    // ==================== UI 过渡动画 ====================

    /**
     * 面板弹入（缩放 + 淡入）
     */
    public playPanelOpen(panelNode: Node, callback?: () => void) {
        if (!panelNode?.isValid) return;

        panelNode.setScale(0.5, 0.5, 1);
        const opacity = panelNode.getComponent(UIOpacity) || panelNode.addComponent(UIOpacity);
        opacity.opacity = 0;

        tween(panelNode)
            .to(this.POPUP_DURATION, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'backOut' })
            .to(0.08, { scale: new Vec3(1, 1, 1) })
            .call(() => { if (callback) callback(); })
            .start();

        tween(opacity)
            .to(this.FADE_DURATION, { opacity: 255 })
            .start();
    }

    /**
     * 面板弹出（缩放 + 淡出）
     */
    public playPanelClose(panelNode: Node, callback?: () => void) {
        if (!panelNode?.isValid) {
            if (callback) callback();
            return;
        }

        const opacity = panelNode.getComponent(UIOpacity) || panelNode.addComponent(UIOpacity);

        tween(panelNode)
            .to(this.POPUP_DURATION, { scale: new Vec3(0.8, 0.8, 1) }, { easing: 'backIn' })
            .call(() => { if (callback) callback(); })
            .start();

        tween(opacity)
            .to(this.FADE_DURATION, { opacity: 0 })
            .start();
    }

    /**
     * Toast动画（从下方滑入 → 停留 → 淡出）
     */
    public playToast(toastNode: Node, duration: number = this.TOAST_DURATION) {
        if (!toastNode?.isValid) return;

        const targetY = toastNode.position.y;
        toastNode.setPosition(toastNode.position.x, targetY - 50, toastNode.position.z);
        const opacity = toastNode.getComponent(UIOpacity) || toastNode.addComponent(UIOpacity);
        opacity.opacity = 0;

        tween(toastNode)
            .to(0.3, { position: new Vec3(toastNode.position.x, targetY, toastNode.position.z) }, { easing: 'sineOut' })
            .start();

        tween(opacity)
            .to(0.3, { opacity: 255 })
            .delay(duration - 0.6)
            .to(0.3, { opacity: 0 })
            .call(() => { if (toastNode.isValid) toastNode.destroy(); })
            .start();
    }

    // ==================== 通用工具动画 ====================

    /**
     * 按钮点击脉冲反馈
     */
    public playButtonPulse(targetNode: Node) {
        if (!targetNode?.isValid) return;
        tween(targetNode)
            .to(0.08, { scale: new Vec3(0.9, 0.9, 1) })
            .to(0.08, { scale: new Vec3(1.05, 1.05, 1) })
            .to(0.06, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    /**
     * 抖动效果（用于错误提示、警告等）
     */
    public playShake(targetNode: Node, intensity: number = 5, duration: number = 0.3) {
        if (!targetNode?.isValid) return;
        const origX = targetNode.position.x;
        const origY = targetNode.position.y;
        const d = duration / 6;

        tween(targetNode)
            .to(d, { position: new Vec3(origX - intensity, origY, 0) })
            .to(d, { position: new Vec3(origX + intensity, origY, 0) })
            .to(d, { position: new Vec3(origX - intensity * 0.5, origY, 0) })
            .to(d, { position: new Vec3(origX + intensity * 0.5, origY, 0) })
            .to(d, { position: new Vec3(origX - intensity * 0.25, origY, 0) })
            .to(d, { position: new Vec3(origX, origY, 0) })
            .start();
    }

    // ==================== 外部接口 ====================

    /**
     * 设置金币HUD位置（影响金币飞行目标）
     */
    public setGoldHudPosition(pos: Vec3) {
        this.goldHudPosition.set(pos);
    }

    /**
     * 停止所有活跃的Tween
     */
    private stopAllTweens() {
        for (const [, t] of this.activeTweens) {
            t.stop();
        }
        this.activeTweens.clear();
    }
}
