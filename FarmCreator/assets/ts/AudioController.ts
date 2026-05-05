// AudioController.ts

import { AudioClip, AudioSource, Component, _decorator, resources, error } from 'cc';
import { common } from './Common';
import { eventBus, GameEvent } from './EventBus';
const { ccclass, property } = _decorator;


@ccclass("AudioController")
export class AudioController extends Component {
    // 背景音乐
    public backgroud: AudioSource = new AudioSource;

    // 音效：点击
    public clipClick: AudioClip = null!;

    // 音效：扩展
    public clipExtand: AudioClip = null!;

    // 音效：铲除
    public clipWipe: AudioClip = null!;

    // 音效：收获
    public clipGather: AudioClip = null!;

    // 音效：烟花
    public clipFireworks: AudioClip = null!;


    protected onLoad(): void {
        common.audioController = this;

        // 背景音乐
        resources.load('audio/bg', AudioClip, (err, audio) => { this.backgroud.clip = audio; });

        // 加载音效：点击
        resources.load('audio/click', AudioClip, (err, audio) => { if (err) { console.log("load audio error"); error(err.message || err); return; } this.clipClick = audio; })

        // 加载音效：扩展
        resources.load('audio/extand', AudioClip, (err, audio) => { if (err) { console.log("load audio error"); error(err.message || err); return; } this.clipExtand = audio; })

        // 加载音效：铲除
        resources.load('audio/wipe', AudioClip, (err, audio) => { if (err) { console.log("load audio error"); error(err.message || err); return; } this.clipWipe = audio; })

        // 加载音效：收获
        resources.load('audio/gather', AudioClip, (err, audio) => { if (err) { console.log("load audio error"); error(err.message || err); return; } this.clipGather = audio; })

        // 加载音效：烟花
        resources.load('audio/fireworks', AudioClip, (err, audio) => { if (err) { console.log("load audio error"); error(err.message || err); return; } this.clipFireworks = audio; })

        // 注册 EventBus 事件监听 - 游戏事件自动触发音效
        this.registerEventBus();
    }

    onDestroy() {
        this.unregisterEventBus();
    }

    /**
     * 注册 EventBus 事件
     */
    private registerEventBus() {
        eventBus.on(GameEvent.CROP_HARVESTED, this.onCropHarvested, this);
        eventBus.on(GameEvent.CROP_PLANTED, this.onCropPlanted, this);
        eventBus.on(GameEvent.ACHIEVEMENT_UNLOCKED, this.onAchievementUnlocked, this);
        eventBus.on(GameEvent.TASK_COMPLETED, this.onTaskCompleted, this);
        eventBus.on(GameEvent.GAME_PAUSED, this.onGamePaused, this);
        eventBus.on(GameEvent.GAME_RESUMED, this.onGameResumed, this);
        eventBus.on(GameEvent.UI_OPEN, this.onUIOpen, this);
        eventBus.on(GameEvent.UI_CLOSE, this.onUIClose, this);
    }

    /**
     * 取消 EventBus 事件
     */
    private unregisterEventBus() {
        eventBus.off(GameEvent.CROP_HARVESTED, this.onCropHarvested, this);
        eventBus.off(GameEvent.CROP_PLANTED, this.onCropPlanted, this);
        eventBus.off(GameEvent.ACHIEVEMENT_UNLOCKED, this.onAchievementUnlocked, this);
        eventBus.off(GameEvent.TASK_COMPLETED, this.onTaskCompleted, this);
        eventBus.off(GameEvent.GAME_PAUSED, this.onGamePaused, this);
        eventBus.off(GameEvent.GAME_RESUMED, this.onGameResumed, this);
        eventBus.off(GameEvent.UI_OPEN, this.onUIOpen, this);
        eventBus.off(GameEvent.UI_CLOSE, this.onUIClose, this);
    }

    // ==================== EventBus 事件回调 ====================

    private onCropHarvested(data: any) {
        this.playSoundGather();
    }

    private onCropPlanted(data: any) {
        this.playSoundClick();
    }

    private onAchievementUnlocked(data: any) {
        this.playSoundFireworks();
    }

    private onTaskCompleted(data: any) {
        this.playSoundFireworks();
    }

    private onGamePaused(data: any) {
        this.pauseBGM();
    }

    private onGameResumed(data: any) {
        this.playBGM();
    }

    private onUIOpen(data: any) {
        this.playSoundClick();
    }

    private onUIClose(data: any) {
        this.playSoundClick();
    }

    // 播放音效, filename: 文件名，例如：click（相对于resources/audio的路径）
    playSound(filename) {
        resources.load("audio/" + filename, AudioClip, (err, audio) => {
            this.backgroud.playOneShot(audio);
        })
    }

    // 播放音乐
    playBGM() {
        this.backgroud.play();
    }

    // 暂停音乐
    pauseBGM() {
        this.backgroud.pause();
    }

    // 停止音乐
    stopBGM() {
        this.backgroud.stop();
    }

    // 音效：点击
    playSoundClick() {
        if (this.clipClick) this.backgroud.playOneShot(this.clipClick, 1);
    }

    // 音效：扩建
    playSoundExtand() {
        if (this.clipExtand) this.backgroud.playOneShot(this.clipExtand, 1);
    }

    // 音效：铲除
    playSoundWipe() {
        if (this.clipWipe) this.backgroud.playOneShot(this.clipWipe, 1);
    }

    // 音效：收获
    playSoundGather() {
        if (this.clipGather) this.backgroud.playOneShot(this.clipGather, 1);
    }

    // 音效：烟花
    playSoundFireworks() {
        if (this.clipFireworks) this.backgroud.playOneShot(this.clipFireworks, 1);
    }
}