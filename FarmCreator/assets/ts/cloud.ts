import { _decorator, Component, Node, tween, Vec3, Tween, UITransform, UIOpacity, resources, SpriteAtlas, Sprite, Animation, AnimationClip, find } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Cloud')
export class Cloud extends Component {
    start() {
        const self = this.node;
        const uiOpacity = self.getComponent(UIOpacity) || self.addComponent(UIOpacity);
        uiOpacity.opacity = 0;

        // 在6秒内逐渐将节点的不透明度从0变为255，使节点变为完全可见。此动画设置为永久重复。
        const seqOpacity: Tween<UIOpacity> = tween(uiOpacity)
            .delay(1)
            .to(6, { opacity: 255 })
            .union()
            .repeatForever();

        // 在500秒内将节点在x方向上移动1000个单位。移动后，它将节点的x位置重置为节点宽度的负值，有效地创建了一个循环，使节点从右向左移动穿过屏幕。此动画也设置为永久重复。
        const seqPosition: Tween<Node> = tween(self)
            .delay(1)
            .by(500, { position: new Vec3(1000, self.getPosition().y, 0) })
            .call(() => {
                const contentSize = self.getComponent(UITransform).contentSize;
                self.setPosition(new Vec3(-contentSize.width, self.getPosition().y, 0));
            })
            .union()
            .repeatForever();

        seqOpacity.start();
        seqPosition.start();

        // 延迟加载大型装饰资产（大山 + 飞鸟），不阻塞首帧显示
        this.scheduleOnce(() => {
            this.loadDeferredAssets();
        }, 0.5);
    }

    /**
     * 延迟加载大型装饰资产（mountain + bird）
     */
    private loadDeferredAssets() {
        // ---- mountain 精灵 (sanguo spritesheet, 5.1MB) ----
        const mountain = find('Canvas/backLayer/mountain');
        if (mountain) {
            console.log('[Cloud] 开始延迟加载 sanguo spritesheet...');
            resources.loadDir('sanguo', SpriteAtlas, (err, atlases) => {
                if (err || !atlases || atlases.length === 0) {
                    console.warn('[Cloud] sanguo spritesheet 加载失败:', err || 'no atlas, count=' + (atlases ? atlases.length : 'null'));
                    return;
                }
                const atlas = atlases[0] as SpriteAtlas;
                const sprite = mountain.getComponent(Sprite);
                console.log('[Cloud] sanguo atlas 加载成功, sprite存在=' + !!sprite + ', atlas帧数=' + atlas.getSpriteFrames().length);
                if (sprite && atlas) {
                    const frames = atlas.getSpriteFrames();
                    if (frames && frames.length > 0) {
                        sprite.spriteFrame = frames[0];
                        sprite.enabled = true;
                        mountain.active = true;
                        // 大山定位在左侧云彩出现的位置
                        mountain.setPosition(-380, 80, 0);
                        console.log('[Cloud] 大山 sanguo 加载完成 (' + frames.length + '帧, pos=-380,80)');
                    } else {
                        console.warn('[Cloud] sanguo atlas 加载成功但无帧');
                    }
                } else {
                    console.warn('[Cloud] sanguo sprite或atlas为null: sprite=' + !!sprite + ' atlas=' + !!atlas);
                }
            });
        } else {
            console.warn('[Cloud] 未找到 mountain 节点');
        }

        // ---- bird 飞鸟（异步加载图集 + 动画 + 左侧飞行） ----
        const bird = find('Canvas/effectLayer/bird');
        if (bird) {
            console.log('[Cloud] 开始延迟加载 bird 飞鸟...');
            resources.load('effect/bird/bird', SpriteAtlas, (err, atlas) => {
                if (err || !atlas) {
                    console.warn('[Cloud] bird 图集加载失败:', err || 'atlas is null');
                    return;
                }
                const spr = bird.getComponent(Sprite);
                if (spr) {
                    const frames = atlas.getSpriteFrames();
                    if (frames && frames.length > 0) {
                        spr.spriteFrame = frames[0];
                        spr.enabled = true;
                    }
                }
                resources.load('animation/bird', AnimationClip, (err2, clip) => {
                    if (err2 || !clip) {
                        console.warn('[Cloud] bird 动画加载失败:', err2 || 'clip is null');
                        return;
                    }
                    const anim = bird.getComponent(Animation);
                    const uiTransform = bird.getComponent(UITransform);
                    if (anim && clip && uiTransform) {
                        anim.defaultClip = clip;
                        anim.addClip(clip, 'bird');
                        anim.play();

                        // 飞鸟在左侧飞行（云彩出现区域附近）
                        const birdWidth = uiTransform.contentSize.width;
                        const canvasWidth = 800;
                        // 左半区：从左侧外部飞到右侧，反转方向使其在左侧活动
                        const startX = -canvasWidth / 2 - birdWidth;      // 左侧屏幕外
                        const endX = -birdWidth / 2;                       // 左侧刚进入屏幕
                        bird.setPosition(startX, bird.position.y, 0);
                        tween(bird)
                            .delay(1)
                            .to(30, { position: new Vec3(endX, bird.position.y, 0) })
                            .call(() => {
                                bird.setPosition(startX, bird.position.y, 0);
                            })
                            .union()
                            .repeatForever()
                            .start();

                        console.log('[Cloud] bird 飞鸟动画加载完成（左侧飞行 x:' + startX.toFixed(0) + '→' + endX.toFixed(0) + '）');
                    }
                });
            });
        } else {
            console.warn('[Cloud] 未找到 bird 节点');
        }
    }
}
