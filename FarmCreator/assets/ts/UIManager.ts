import { _decorator, Component, Node, Prefab, instantiate, Label, director, Canvas, Layers, find } from 'cc';
import { common } from './Common';
import { UISimplePanel } from './UISimplePanel';
import { UIFriendsPanel } from './UIFriendsPanel';
import { UITutorial } from './UITutorial';
import { eventBus, GameEvent } from './EventBus';
import { AnimationSystem } from './AnimationSystem';
const { ccclass, property } = _decorator;

/**
 * UI管理器 - 统一管理游戏中的UI面板
 */
@ccclass('UIManager')
export class UIManager extends Component {
    private static instance: UIManager = null;

    // 当前打开的面板
    private currentShopPanel: Node = null;
    private currentWarehousePanel: Node = null;
    private currentSavePanel: Node = null;
    private currentFriendsPanel: Node = null;
    private currentTutorialPanel: Node = null;

    onLoad() {
        if (UIManager.instance) {
            this.node.destroy();
            return;
        }
        UIManager.instance = this;

        // 监听UI关闭事件
        eventBus.on(GameEvent.UI_CLOSE, this.onUIClose, this);

        console.log('[UIManager] 初始化完成');
    }

    onDestroy() {
        if (UIManager.instance === this) {
            UIManager.instance = null;
        }
        eventBus.off(GameEvent.UI_CLOSE, this.onUIClose, this);
    }

    /**
     * 处理UI关闭事件
     */
    private onUIClose(data: { panel: string }) {
        if (!data) return;
        switch (data.panel) {
            case 'shop': this.closeShopPanel(); break;
            case 'warehouse': this.closeWarehousePanel(); break;
            case 'save': this.closeSavePanel(); break;
            case 'friends': this.closeFriendsPanel(); break;
            case 'tutorial': this.closeTutorialPanel(); break;
        }
    }

    /**
     * 获取单例
     */
    public static getInstance(): UIManager {
        // 如果实例不存在，尝试自动创建
        if (!UIManager.instance) {
            UIManager.ensureInstance();
        }
        return UIManager.instance;
    }

    /**
     * 确保UIManager实例存在（自动创建）
     */
    public static ensureInstance(): boolean {
        if (UIManager.instance) {
            return true;
        }

        // 查找是否已有UIManager节点
        let uiManagerNode = find('Canvas/UIManager');
        
        if (!uiManagerNode) {
            console.log('[UIManager] 自动创建UIManager节点');
            
            // 获取Canvas
            const canvas = find('Canvas');
            if (!canvas) {
                console.warn('[UIManager] 找不到Canvas节点，无法创建UIManager');
                return false;
            }

            // 创建UIManager节点
            uiManagerNode = new Node('UIManager');
            uiManagerNode.layer = Layers.Enum.UI_2D;
            uiManagerNode.parent = canvas;

            // 添加UIManager组件
            uiManagerNode.addComponent(UIManager);
            
            console.log('[UIManager] UIManager节点创建完成');
        }

        return UIManager.instance !== null;
    }

    /**
     * 打开商店面板
     */
    public openShopPanel() {
        // 如果已经打开，则关闭
        if (this.currentShopPanel) {
            this.closeShopPanel();
            return;
        }

        // 关闭仓库面板（如果打开的话）
        if (this.currentWarehousePanel) {
            this.closeWarehousePanel();
        }

        // 获取Canvas作为parent
        const canvas = find('Canvas');
        if (!canvas) {
            console.warn('[UIManager] 找不到Canvas节点');
            return;
        }

        // 创建简单商店面板 - 放在Canvas下确保正确显示
        this.currentShopPanel = new Node('ShopPanel');
        this.currentShopPanel.layer = Layers.Enum.UI_2D;
        this.currentShopPanel.parent = canvas;
        // 设置面板位置在屏幕中心
        this.currentShopPanel.setPosition(0, 0, 100);

        const panel = this.currentShopPanel.addComponent(UISimplePanel);
        panel.initShop();

        // 播放面板弹入动画
        const animSystem = AnimationSystem.getInstance();
        if (animSystem) {
            animSystem.playPanelOpen(this.currentShopPanel);
        }

        console.log('[UIManager] 商店面板已打开');
        eventBus.emit(GameEvent.UI_OPEN, { panel: 'shop' });
    }

    /**
     * 关闭商店面板
     */
    public closeShopPanel() {
        if (this.currentShopPanel) {
            const animSystem = AnimationSystem.getInstance();
            if (animSystem) {
                animSystem.playPanelClose(this.currentShopPanel, () => {
                    if (this.currentShopPanel) {
                        this.currentShopPanel.destroy();
                        this.currentShopPanel = null;
                    }
                });
            } else {
                this.currentShopPanel.destroy();
                this.currentShopPanel = null;
            }
            console.log('[UIManager] 商店面板已关闭');
            eventBus.emit(GameEvent.UI_CLOSE, { panel: 'shop' });
        }
    }

    /**
     * 打开仓库面板
     */
    public openWarehousePanel() {
        // 如果已经打开，则关闭
        if (this.currentWarehousePanel) {
            this.closeWarehousePanel();
            return;
        }

        // 关闭商店面板（如果打开的话）
        if (this.currentShopPanel) {
            this.closeShopPanel();
        }

        // 获取Canvas作为parent
        const canvas = find('Canvas');
        if (!canvas) {
            console.warn('[UIManager] 找不到Canvas节点');
            return;
        }

        // 创建简单仓库面板 - 放在Canvas下确保正确显示
        this.currentWarehousePanel = new Node('WarehousePanel');
        this.currentWarehousePanel.layer = Layers.Enum.UI_2D;
        this.currentWarehousePanel.parent = canvas;
        // 设置面板位置在屏幕中心
        this.currentWarehousePanel.setPosition(0, 0, 100);

        const panel = this.currentWarehousePanel.addComponent(UISimplePanel);
        panel.initWarehouse();

        // 播放面板弹入动画
        const animSystem = AnimationSystem.getInstance();
        if (animSystem) {
            animSystem.playPanelOpen(this.currentWarehousePanel);
        }

        console.log('[UIManager] 仓库面板已打开');
        eventBus.emit(GameEvent.UI_OPEN, { panel: 'warehouse' });
    }

    /**
     * 关闭仓库面板
     */
    public closeWarehousePanel() {
        if (this.currentWarehousePanel) {
            const animSystem = AnimationSystem.getInstance();
            if (animSystem) {
                animSystem.playPanelClose(this.currentWarehousePanel, () => {
                    if (this.currentWarehousePanel) {
                        this.currentWarehousePanel.destroy();
                        this.currentWarehousePanel = null;
                    }
                });
            } else {
                this.currentWarehousePanel.destroy();
                this.currentWarehousePanel = null;
            }
            console.log('[UIManager] 仓库面板已关闭');
            eventBus.emit(GameEvent.UI_CLOSE, { panel: 'warehouse' });
        }
    }

    /**
     * 显示提示信息
     */
    public showToast(message: string) {
        console.log(`[Toast] ${message}`);
        // 可以在这里实现Toast提示
    }

    // ==================== 存档UI ====================

    /**
     * 打开存档面板
     */
    public openSavePanel() {
        if (this.currentSavePanel) {
            this.closeSavePanel();
            return;
        }

        // 关闭其他面板
        if (this.currentShopPanel) this.closeShopPanel();
        if (this.currentWarehousePanel) this.closeWarehousePanel();

        const canvas = find('Canvas');
        if (!canvas) return;

        this.currentSavePanel = new Node('SavePanel');
        this.currentSavePanel.layer = Layers.Enum.UI_2D;
        this.currentSavePanel.parent = canvas;
        this.currentSavePanel.setPosition(0, 0, 100);

        const panel = this.currentSavePanel.addComponent(UISimplePanel);
        panel.initSavePanel();

        // 播放面板弹入动画
        const animSystem = AnimationSystem.getInstance();
        if (animSystem) {
            animSystem.playPanelOpen(this.currentSavePanel);
        }

        console.log('[UIManager] 存档面板已打开');
    }

    /**
     * 关闭存档面板
     */
    public closeSavePanel() {
        if (this.currentSavePanel) {
            const animSystem = AnimationSystem.getInstance();
            if (animSystem) {
                animSystem.playPanelClose(this.currentSavePanel, () => {
                    if (this.currentSavePanel) {
                        this.currentSavePanel.destroy();
                        this.currentSavePanel = null;
                    }
                });
            } else {
                this.currentSavePanel.destroy();
                this.currentSavePanel = null;
            }
            console.log('[UIManager] 存档面板已关闭');
        }
    }

    // ==================== 好友面板 ====================

    /**
     * 打开好友面板
     */
    public openFriendsPanel() {
        if (this.currentFriendsPanel) {
            this.closeFriendsPanel();
            return;
        }

        // 关闭其他面板
        if (this.currentShopPanel) this.closeShopPanel();
        if (this.currentWarehousePanel) this.closeWarehousePanel();

        const canvas = find('Canvas');
        if (!canvas) return;

        this.currentFriendsPanel = new Node('FriendsPanel');
        this.currentFriendsPanel.layer = Layers.Enum.UI_2D;
        this.currentFriendsPanel.parent = canvas;
        this.currentFriendsPanel.setPosition(0, 0, 100);

        const panel = this.currentFriendsPanel.addComponent(UIFriendsPanel);
        this.currentFriendsPanel.active = true;

        // 播放面板弹入动画
        const animSystem = AnimationSystem.getInstance();
        if (animSystem) {
            animSystem.playPanelOpen(this.currentFriendsPanel);
        }

        console.log('[UIManager] 好友面板已打开');
        eventBus.emit(GameEvent.UI_OPEN, { panel: 'friends' });
    }

    /**
     * 关闭好友面板
     */
    public closeFriendsPanel() {
        if (this.currentFriendsPanel) {
            const animSystem = AnimationSystem.getInstance();
            if (animSystem) {
                animSystem.playPanelClose(this.currentFriendsPanel, () => {
                    if (this.currentFriendsPanel) {
                        this.currentFriendsPanel.destroy();
                        this.currentFriendsPanel = null;
                    }
                });
            } else {
                this.currentFriendsPanel.destroy();
                this.currentFriendsPanel = null;
            }
            console.log('[UIManager] 好友面板已关闭');
            eventBus.emit(GameEvent.UI_CLOSE, { panel: 'friends' });
        }
    }

    // ==================== 新手引导面板 ====================

    /**
     * 打开新手引导面板
     */
    public openTutorialPanel() {
        if (this.currentTutorialPanel) {
            this.closeTutorialPanel();
            return;
        }

        const canvas = find('Canvas');
        if (!canvas) return;

        this.currentTutorialPanel = new Node('TutorialPanel');
        this.currentTutorialPanel.layer = Layers.Enum.UI_2D;
        this.currentTutorialPanel.parent = canvas;
        this.currentTutorialPanel.setPosition(0, 0, 100);

        this.currentTutorialPanel.addComponent(UITutorial);
        this.currentTutorialPanel.active = true;

        // 播放面板弹入动画
        const animSystem = AnimationSystem.getInstance();
        if (animSystem) {
            animSystem.playPanelOpen(this.currentTutorialPanel);
        }

        console.log('[UIManager] 新手引导面板已打开');
        eventBus.emit(GameEvent.UI_OPEN, { panel: 'tutorial' });
    }

    /**
     * 关闭新手引导面板
     */
    public closeTutorialPanel() {
        if (this.currentTutorialPanel) {
            const animSystem = AnimationSystem.getInstance();
            if (animSystem) {
                animSystem.playPanelClose(this.currentTutorialPanel, () => {
                    if (this.currentTutorialPanel) {
                        this.currentTutorialPanel.destroy();
                        this.currentTutorialPanel = null;
                    }
                });
            } else {
                this.currentTutorialPanel.destroy();
                this.currentTutorialPanel = null;
            }
            console.log('[UIManager] 新手引导面板已关闭');
        }
    }
}
