import { _decorator, Component } from 'cc';
import { eventBus, GameEvent } from './EventBus';

const { ccclass, property } = _decorator;

/**
 * 好友系统
 * 
 * 功能：
 * - 好友列表管理（添加/删除/列表）
 * - 好友访问/参观农场
 * - 好友互动（送礼/帮忙浇水）
 * - 好友排行（等级/金币）
 * 
 * 注意：本版本为本地模拟版，未接入网络。
 * 预留网络接口，后续可扩展为在线好友。
 */
@ccclass('FriendsSystem')
export class FriendsSystem extends Component {
    private static instance: FriendsSystem = null;

    // 模拟好友数据
    private _friends: FriendInfo[] = [];
    private _maxFriends: number = 50;
    private _visitCooldown: number = 3600; // 访问冷却（秒）
    private _lastVisitTime: Map<string, number> = new Map();

    // 事件名
    public static readonly EVENT_FRIEND_ADDED = 'friend_added';
    public static readonly EVENT_FRIEND_REMOVED = 'friend_removed';
    public static readonly EVENT_FRIEND_VISITED = 'friend_visited';
    public static readonly EVENT_GIFT_SENT = 'gift_sent';

    // ==================== 单例 ====================

    onLoad() {
        if (FriendsSystem.instance) {
            this.node.destroy();
            return;
        }
        FriendsSystem.instance = this;

        // 初始化模拟好友
        this.initMockFriends();

        console.log('[FriendsSystem] 初始化完成');
    }

    onDestroy() {
        if (FriendsSystem.instance === this) {
            FriendsSystem.instance = null;
        }
    }

    public static getInstance(): FriendsSystem {
        return FriendsSystem.instance;
    }

    // ==================== 公共 API ====================

    /** 获取好友列表 */
    public getFriends(): FriendInfo[] {
        return [...this._friends];
    }

    /** 获取好友数量 */
    public get friendCount(): number {
        return this._friends.length;
    }

    /** 是否达到好友上限 */
    public get isFull(): boolean {
        return this._friends.length >= this._maxFriends;
    }

    /** 添加好友 */
    public addFriend(friend: FriendInfo): boolean {
        if (this.isFull) {
            console.warn('[FriendsSystem] 好友已达上限');
            return false;
        }
        if (this._friends.some(f => f.id === friend.id)) {
            console.warn('[FriendsSystem] 好友已存在');
            return false;
        }

        this._friends.push({ ...friend });
        this.node.emit(FriendsSystem.EVENT_FRIEND_ADDED, friend);
        console.log(`[FriendsSystem] 添加好友: ${friend.name}`);
        return true;
    }

    /** 删除好友 */
    public removeFriend(friendId: string): boolean {
        const index = this._friends.findIndex(f => f.id === friendId);
        if (index === -1) {
            console.warn('[FriendsSystem] 好友不存在');
            return false;
        }

        const removed = this._friends.splice(index, 1)[0];
        this.node.emit(FriendsSystem.EVENT_FRIEND_REMOVED, removed);
        console.log(`[FriendsSystem] 删除好友: ${removed.name}`);
        return true;
    }

    /** 查找好友 */
    public getFriend(friendId: string): FriendInfo | null {
        return this._friends.find(f => f.id === friendId) || null;
    }

    /** 访问好友农场 */
    public visitFriend(friendId: string): boolean {
        const friend = this.getFriend(friendId);
        if (!friend) {
            console.warn('[FriendsSystem] 好友不存在');
            return false;
        }

        // 检查冷却
        const now = Date.now() / 1000;
        const lastVisit = this._lastVisitTime.get(friendId) || 0;
        if (now - lastVisit < this._visitCooldown) {
            const remaining = Math.ceil(this._visitCooldown - (now - lastVisit));
            console.warn(`[FriendsSystem] 访问冷却中，还需 ${remaining} 秒`);
            return false;
        }

        // 更新访问记录
        this._lastVisitTime.set(friendId, now);
        friend.visitCount++;

        this.node.emit(FriendsSystem.EVENT_FRIEND_VISITED, friend);
        eventBus.emit(GameEvent.EXP_GAINED, { amount: 5, reason: 'visit_friend' });
        console.log(`[FriendsSystem] 访问 ${friend.name} 的农场，获得 5 经验`);
        return true;
    }

    /** 送礼给好友 */
    public sendGift(friendId: string, giftType: string, quantity: number): boolean {
        const friend = this.getFriend(friendId);
        if (!friend) return false;

        this.node.emit(FriendsSystem.EVENT_GIFT_SENT, { friendId, giftType, quantity });
        eventBus.emit(GameEvent.EXP_GAINED, { amount: 10, reason: 'send_gift' });
        console.log(`[FriendsSystem] 送礼给 ${friend.name}: ${giftType} x${quantity}`);
        return true;
    }

    /** 按等级排序 */
    public getFriendsByLevel(): FriendInfo[] {
        return [...this._friends].sort((a, b) => b.level - a.level);
    }

    /** 按金币排序 */
    public getFriendsByGold(): FriendInfo[] {
        return [...this._friends].sort((a, b) => (b.gold || 0) - (a.gold || 0));
    }

    // ==================== 存档 ====================

    public getSaveData() {
        return {
            friends: this._friends,
        };
    }

    public restoreFromSave(data: { friends: FriendInfo[] }) {
        if (data && data.friends) {
            this._friends = data.friends;
            console.log(`[FriendsSystem] 从存档恢复 ${this._friends.length} 个好友`);
        }
    }

    // ==================== 内部方法 ====================

    /** 初始化模拟好友数据 */
    private initMockFriends() {
        const mockNames = ['农场小王', '种植达人', '丰收公主', '阳光农夫', '快乐农场主',
                          '田园诗人', '绿色守护者', '金秋收获', '春播秋收', '四季花园'];

        for (let i = 0; i < mockNames.length; i++) {
            this._friends.push({
                id: `friend_${i + 1}`,
                name: mockNames[i],
                level: Math.floor(Math.random() * 20) + 1,
                gold: Math.floor(Math.random() * 5000),
                lastOnline: Date.now() - Math.floor(Math.random() * 86400000),
                visitCount: 0,
                isOnline: Math.random() > 0.5,
            });
        }
    }
}

/** 好友信息接口（类型定义在 global.d.ts） */