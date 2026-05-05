import { _decorator, Component, Node, Label, Button, UITransform, Vec3, Color, Sprite, math, Widget, Layout } from 'cc';
import { TutorialManager, TutorialStepDef } from './TutorialManager';
import { eventBus, GameEvent } from './EventBus';

const { ccclass, property } = _decorator;

/**
 * 新手引导UI
 * 
 * 功能：
 * - 显示引导步骤标题和描述
 * - 高亮遮罩+箭头指引
 * - 支持跳过引导
 * - 自动跟随 TutorialManager 步骤
 */
@ccclass('UITutorial')
export class UITutorial extends Component {

    @property(Label)
    titleLabel: Label = null;

    @property(Label)
    descLabel: Label = null;

    @property(Label)
    stepLabel: Label = null;

    @property(Button)
    skipBtn: Button = null;

    @property(Button)
    nextBtn: Button = null;

    @property(Node)
    maskNode: Node = null;

    @property(Node)
    highlightNode: Node = null;

    @property(Node)
    arrowNode: Node = null;

    @property(Node)
    dialogNode: Node = null;

    private _tutorialManager: TutorialManager = null;

    onLoad() {
        this._tutorialManager = TutorialManager.getInstance();

        // 跳过按钮
        if (this.skipBtn) {
            this.skipBtn.node.on(Button.EventType.CLICK, this.onSkipClick, this);
        }

        // 下一步按钮（手动推进时使用）
        if (this.nextBtn) {
            this.nextBtn.node.on(Button.EventType.CLICK, this.onNextClick, this);
            this.nextBtn.node.active = false;
        }

        // 监听引导步骤变化
        if (this._tutorialManager) {
            this._tutorialManager.onStepChange(this.onStepChanged.bind(this));
        }

        // 监听引导完成
        eventBus.on(GameEvent.TUTORIAL_COMPLETED, this.onTutorialCompleted, this);
        eventBus.on(GameEvent.TUTORIAL_STEP_CHANGED, this.onStepEvent, this);
    }

    onDestroy() {
        eventBus.off(GameEvent.TUTORIAL_COMPLETED, this.onTutorialCompleted, this);
        eventBus.off(GameEvent.TUTORIAL_STEP_CHANGED, this.onStepEvent, this);
    }

    onEnable() {
        if (this._tutorialManager && !this._tutorialManager.isCompleted) {
            this.showStep(this._tutorialManager.currentStep, this._tutorialManager.currentStepIndex);
        } else {
            this.node.active = false;
        }
    }

    /**
     * TutorialManager 回调触发步骤变化
     */
    private onStepChanged(step: TutorialStepDef, index: number) {
        this.showStep(step, index);
    }

    /**
     * EventBus 步骤变化事件
     */
    private onStepEvent(data: any) {
        if (data && data.step) {
            this.showStep(data.step, data.index || 0);
        }
    }

    /**
     * 显示指定步骤
     */
    private showStep(step: TutorialStepDef, index: number) {
        if (!step) return;

        // 更新文本
        if (this.titleLabel) {
            this.titleLabel.string = step.title;
        }
        if (this.descLabel) {
            this.descLabel.string = step.description;
        }
        if (this.stepLabel) {
            const total = this._tutorialManager ? this._tutorialManager.totalSteps : 10;
            this.stepLabel.string = `${index + 1} / ${total}`;
        }

        // 根据步骤类型调整UI
        this.updateUIForAction(step);

        // 显示对话气泡
        if (this.dialogNode) {
            this.dialogNode.active = true;
        }

        console.log(`[UITutorial] 显示步骤: ${step.title}`);
    }

    /**
     * 根据动作类型调整UI表现
     */
    private updateUIForAction(step: TutorialStepDef) {
        // 隐藏箭头和高亮（默认）
        if (this.arrowNode) this.arrowNode.active = false;
        if (this.highlightNode) this.highlightNode.active = false;

        // 部分步骤显示"下一步"按钮
        const showNextBtn = step.action === 'tap_anywhere' || step.action === 'wait';
        if (this.nextBtn) {
            this.nextBtn.node.active = showNextBtn;
        }

        switch (step.action) {
            case 'plant_crop':
                // 高亮空地区域（指向农田）
                this.showHighlightAt(new Vec3(0, -100, 0));
                break;
            case 'harvest':
                // 高亮成熟作物
                this.showHighlightAt(new Vec3(0, -100, 0));
                break;
            case 'open_panel':
                // 高亮对应按钮（仓库/商店）
                this.showHighlightAt(new Vec3(200, 300, 0));
                if (this.arrowNode) this.arrowNode.active = true;
                break;
            case 'sell':
            case 'buy':
                // 高亮操作区域
                this.showHighlightAt(new Vec3(0, 0, 0));
                break;
            case 'expand':
                // 高亮扩建牌
                this.showHighlightAt(new Vec3(0, -200, 0));
                break;
        }
    }

    /**
     * 在指定位置显示高亮
     */
    private showHighlightAt(pos: Vec3) {
        if (this.highlightNode) {
            this.highlightNode.active = true;
            this.highlightNode.setPosition(pos);
        }
        if (this.arrowNode) {
            this.arrowNode.active = true;
            this.arrowNode.setPosition(pos.x, pos.y + 80, pos.z);
        }
    }

    /**
     * 跳过按钮
     */
    private onSkipClick() {
        if (this._tutorialManager) {
            this._tutorialManager.skip();
        }
        this.node.active = false;
    }

    /**
     * 下一步按钮（手动推进）
     */
    private onNextClick() {
        // 对于自动推进的步骤，点击"下一步"也能推进
        if (this.nextBtn) {
            this.nextBtn.node.active = false;
        }
    }

    /**
     * 引导完成
     */
    private onTutorialCompleted(data?: any) {
        this.node.active = false;
        console.log('[UITutorial] 引导已完成，隐藏UI');
    }
}
