import { _decorator, Component, Node, Animation, UIOpacity, AnimationClip, assetManager, resources } from 'cc';
import { common } from './Common';
const { ccclass, property } = _decorator;

/** 烟花动画 UUID（取自 fireworks.anim.meta）*/
const FIREWORKS_ANIM_UUID = '50ebb277-56fc-4760-bb48-bc28627bfa67';

@ccclass('Brand')
export class Brand extends Component {

    // 使用property装饰器定义fireworks属性，类型为Node
    @property({ type: Node })
    fireworks: Node = null;

    /** 烟花动画片段缓存（首次点击时异步加载，之后复用） */
    private _fireworksClip: AnimationClip | null = null;
    /** 是否正在加载中（防重复加载） */
    private _isLoading: boolean = false;

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    }

    onTouchStart(event: Event) {
        common.audioController.playSoundClick();   // 播放点击音效

        const uiOpacity = this.fireworks.getComponent(UIOpacity) || this.fireworks.addComponent(UIOpacity);
        uiOpacity.opacity = 255;
        this.fireworks.active = true;

        const anim: Animation = this.fireworks.getComponent(Animation);
        if (!anim) return;

        // 1) 缓存命中
        if (this._fireworksClip) {
            this._playFireworks(anim);
            return;
        }

        // 2) 场景编辑器引用（Animation 组件的 defaultClip / clips[0]）
        const builtinClip = anim.defaultClip || (anim.clips && anim.clips.length > 0 ? anim.clips[0] : null);
        if (builtinClip) {
            this._fireworksClip = builtinClip;
            this._playFireworks(anim);
            return;
        }

        // 3) 资源包回退：resources.load('animation/fireworks') — 文件位于 assets/resources/animation/
        if (this._isLoading) return;
        this._isLoading = true;
        this._tryLoadFromResources(anim);
    }

    /** 从 resources bundle 加载 fireworks 动画 */
    private _tryLoadFromResources(anim: Animation): void {
        resources.load('animation/fireworks', AnimationClip, (err, clip) => {
            if (err || !clip) {
                console.warn('[Brand] resources.load 失败，尝试 UUID 回退');
                this._tryLoadByUUID(anim);
                return;
            }
            this._isLoading = false;
            this._fireworksClip = clip;
            anim.defaultClip = clip;
            anim.addClip(clip, 'fireworks');
            this._playFireworks(anim);
        });
    }

    /** UUID 绝对回退（最后手段） */
    private _tryLoadByUUID(anim: Animation): void {
        assetManager.loadAny({ uuid: FIREWORKS_ANIM_UUID }, (err, clip) => {
            this._isLoading = false;
            if (err || !clip) {
                console.warn('[Brand] fireworks 动画加载失败（所有路径耗尽），禁用以避免崩溃');
                this.fireworks.active = false;
                return;
            }
            this._fireworksClip = clip as AnimationClip;
            anim.defaultClip = this._fireworksClip;
            anim.addClip(this._fireworksClip, 'fireworks');
            this._playFireworks(anim);
        });
    }

    /** 播放烟花动画并监听结束事件 */
    private _playFireworks(anim: Animation) {
        anim.once(Animation.EventType.FINISHED, () => {
            this.fireworks.active = false;
        });
        anim.play('fireworks');
        common.audioController.playSoundFireworks();   // 播放音效烟花
    }
}
