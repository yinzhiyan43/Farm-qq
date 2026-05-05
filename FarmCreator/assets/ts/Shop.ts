import { _decorator, Component, Node, Animation, UIOpacity, instantiate, Prefab, resources } from 'cc';
import { common } from './Common';
import { UIManager } from './UIManager';
const { ccclass, property } = _decorator;

/**
 * 商店入口 - 处理点击事件并打开商店UI
 */
@ccclass('Shop')
export class Shop extends Component {

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    }

    onTouchStart(event: Event) {
        console.log("点击了商店");
        common.audioController?.playSoundClick();
        
        // 使用UIManager打开商店面板（会自动创建实例）
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.openShopPanel();
        } else {
            console.error('[Shop] UIManager创建失败');
        }
    }
}
