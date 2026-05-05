import { _decorator, Component, find, Node, Layers } from 'cc';
import { UIManager } from './UIManager';
const { ccclass, property } = _decorator;

/**
 * MainScene管理器 - 负责MainScene的初始化
 */
@ccclass('MainSceneManager')
export class MainSceneManager extends Component {
    
    onLoad() {
        console.log('[MainSceneManager] onLoad');
        this.ensureUIManager();
    }

    start() {
        console.log('[MainSceneManager] start');
    }

    /**
     * 确保UIManager存在
     */
    private ensureUIManager() {
        // 检查是否已有UIManager
        let uiManager = find('Canvas/UIManager');
        
        if (!uiManager) {
            console.log('[MainSceneManager] 创建UIManager节点');
            
            // 获取Canvas
            const canvas = find('Canvas');
            if (!canvas) {
                console.warn('[MainSceneManager] 找不到Canvas节点');
                return;
            }

            // 创建UIManager节点
            uiManager = new Node('UIManager');
            uiManager.layer = Layers.Enum.UI_2D;
            uiManager.parent = canvas;

            // 添加UIManager组件
            uiManager.addComponent(UIManager);
            
            console.log('[MainSceneManager] UIManager节点创建完成');
        } else {
            console.log('[MainSceneManager] UIManager节点已存在');
        }
    }
}
