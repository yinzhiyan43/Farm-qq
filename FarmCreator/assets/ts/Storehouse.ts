import { _decorator, Component, Node, Animation, UIOpacity, instantiate, Prefab, resources } from 'cc';
import { common } from './Common';
import { UIManager } from './UIManager';
const { ccclass, property } = _decorator;

/**
 * 仓库入口 - 处理点击事件并打开仓库UI
 */
@ccclass('Storehouse')
export class Storehouse extends Component {

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    }

    onTouchStart(event: Event) {
        console.log("点击了仓库");
        common.audioController?.playSoundClick();
        
        // 使用UIManager打开仓库面板（会自动创建实例）
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.openWarehousePanel();
        } else {
            console.error('[Storehouse] UIManager创建失败');
        }
    }
}
