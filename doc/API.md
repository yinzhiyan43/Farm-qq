# FarmCreator API 文档

## 目录

- [Crop.ts - 作物系统](#cropts---作物系统)
- [soil.ts - 土地系统](#soilts---土地系统)
- [AudioController.ts - 音频控制器](#audiocontrollerts---音频控制器)
- [Settings.ts - 游戏设置](#settingsts---游戏设置)
- [Common.ts - 通用工具](#commonts---通用工具)
- [GameManager.ts - 游戏管理器](#gamemanagerts---游戏管理器)

---

## Crop.ts - 作物系统

### 类: CropLifecycle

作物生长阶段定义

| 属性 | 类型 | 说明 |
|------|------|------|
| Name | string | 阶段名称 |
| Fuel | number | 所需养料量 |
| Water | number | 所需水分量 |
| Days | number | 阶段持续天数 |

### 类: CropData

作物数据配置类

| 属性 | 类型 | 说明 |
|------|------|------|
| CropName | string | 作物名称 |
| CropId | number | 作物唯一ID |
| TempLow | number | 最低生长温度 |
| TempHigh | number | 最高生长温度 |
| HarvestMaxTimes | number | 最大收获次数(-1表示无限) |
| Lifecycles | CropLifecycle[] | 生长阶段数组 |

**静态方法**:
```typescript
static deserializeAll(jsonData: any): CropData[]
```
将 JSON 数据反序列化为 CropData 数组

### 类: CropNode

作物节点组件

#### 枚举: CropState

| 值 | 名称 | 说明 |
|-----|------|------|
| 0 | Seed | 种子期 |
| 1 | Seeding | 发芽期 |
| 2 | Growing | 生长期 |
| 3 | GrowingEx | 再生长期 |
| 4 | Flowering | 开花期 |
| 5 | Fructifying | 结果期 |
| 999 | Mature | 成熟期 |
| 1000 | Dead | 死亡期 |

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| cropData | CropData | 作物配置数据 |
| currentLifecycleIndex | number | 当前生长阶段索引 |
| currentLifecycleDays | number | 当前阶段已过天数 |
| currentHarvestTimes | number | 已收获次数 |
| currentState | CropState | 当前状态 |

#### 方法

```typescript
// 初始化作物
init(cropData: CropData, soil: Soil): void

// 生长更新
update(): void

// 生长进度检查
private checkGrowthProgress(): void

// 进入下一生长阶段
private enterNextLifecycle(): void

// 收获作物
harvest(): void

// 获取当前精灵帧名称
getCurrentSpriteFrameName(): string
```

---

## soil.ts - 土地系统

### 类: Soil

土地管理组件

#### 枚举: LandState

| 值 | 名称 | 说明 |
|-----|------|------|
| 0 | Nothing | 无土地 |
| 1 | Virgin | 未开垦 |
| 2 | Dry | 干燥 |
| 3 | DryHalf | 半干 |
| 4 | FatHalf | 半肥 |
| 5 | Fat | 肥沃 |

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| map | TiledMap | 瓦片地图组件 |
| layer | TiledLayer | 土地图层 |
| crops | CropNode[] | 当前种植的作物数组 |
| currentExpandPos | Vec2 | 当前扩建位置 |

#### 方法

```typescript
// 初始化土地系统
onLoad(): void

// 获取瓦片坐标
getTilePos(localClickPos: Vec3): Vec2

// 获取瓦片状态
getTileState(pos: Vec2): LandState

// 设置瓦片状态
setTileState(pos: Vec2, state: LandState): void

// 种植作物
plantCrop(pos: Vec2, cropData: CropData): CropNode

// 铲除作物
removeCrop(pos: Vec2): void

// 收获作物
harvestCrop(pos: Vec2): void

// 扩建土地
expandLand(): void

// 更新扩建牌位置
updateExpandSign(): void
```

---

## AudioController.ts - 音频控制器

### 类: AudioController

音频管理组件

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| bgmAudioSource | AudioSource | 背景音乐源 |
| soundAudioSource | AudioSource | 音效源 |
| bgmClip | AudioClip | 背景音乐剪辑 |
| clickClip | AudioClip | 点击音效剪辑 |
| extandClip | AudioClip | 扩建音效剪辑 |
| wipeClip | AudioClip | 铲除音效剪辑 |
| gatherClip | AudioClip | 收获音效剪辑 |
| fireworksClip | AudioClip | 烟花音效剪辑 |

#### 方法

```typescript
// 播放背景音乐
playBGM(): void

// 暂停背景音乐
pauseBGM(): void

// 停止背景音乐
stopBGM(): void

// 播放点击音效
playSoundClick(): void

// 播放扩建音效
playSoundExtand(): void

// 播放铲除音效
playSoundWipe(): void

// 播放收获音效
playSoundGather(): void

// 播放烟花音效
playSoundFireworks(): void
```

---

## Settings.ts - 游戏设置

### 类: Settings

游戏设置管理（单例模式）

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| instance | Settings | 全局单例实例 |
| soundEffectSwitch | boolean | 音效开关状态 |
| bgmSwitch | boolean | 背景音乐开关状态 |

#### 方法

```typescript
// 获取单例实例
static getInstance(): Settings

// 获取音效开关状态
getSoundEffectSwitch(): boolean

// 获取背景音乐开关状态
getBGMSwitch(): boolean

// 切换音效开关
SwitchSoundEffect(toggle: boolean): void

// 切换背景音乐开关
SwitchBGM(toggle: boolean): void

// 保存设置到本地存储
private saveSettings(): void

// 从本地存储加载设置
private loadSettings(): void
```

#### 存储键值

| 键 | 值类型 | 说明 |
|-----|---------|------|
| soundEffectSwitch | "0"/"1" | 音效开关 |
| bgmSwitch | "0"/"1" | 背景音乐开关 |

---

## Common.ts - 通用工具

### 类: Common

通用工具类

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| naturalEnv | NaturalEnv | 自然环境对象 |

#### 静态方法

```typescript
// 生成指定范围的随机数 [min, max]
static getRandomNumber(min: number, max: number): number

// 将现实时间（天）转换为游戏时间（分钟）
static RealTimeToGameTime(day: number): number

// 异步加载资源
static loadResourceAsync<T>(path: string, type: typeof Asset): Promise<T>
```

### 类: NaturalEnv

自然环境数据

| 属性 | 类型 | 说明 |
|------|------|------|
| Temperature | number | 气温值 |
| Water | number | 水分值 |
| Fuel | number | 养料值 |
| Bug | number | 虫害值 |
| Light | number | 光照值 |
| Wind | number | 风力值 |

### 全局实例

```typescript
export let common: Common = new Common();
```

---

## GameManager.ts - 游戏管理器

### 类: GameManager

游戏管理器组件

#### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| crops | CropData[] | 作物配置数组 |

#### 方法

```typescript
// 组件加载时调用
onLoad(): void

// 初始化游戏资源
async initialize(): Promise<void>

// 加载作物数据
private async loadCropData(): Promise<void>
```

#### 流程

1. `onLoad()` - 预加载 MainScene 场景
2. `initialize()` - 异步加载作物数据
3. `loadScene("MainScene")` - 进入主场景

---

## 事件系统

### 用户交事件

项目使用 Cocos Creator 的触摸事件系统：

```typescript
// 注册点击事件
this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);

// 触摸开始回调
onTouchStart(event: EventTouch): void {
    const touchPos = event.getUILocation();
    // 处理点击逻辑
}
```

### 自定义事件

作物收获事件：
```typescript
// 触发收获
this.node.emit('harvest', cropData);

// 监听收获
this.node.on('harvest', (cropData) => {
    // 处理收获逻辑
});
```

---

## 工具类函数

### 坐标转换

```typescript
// 屏幕坐标 → 瓦片坐标
function screenToTile(screenPos: Vec2): Vec2

// 瓦片坐标 → 世界坐标
function tileToWorld(tilePos: Vec2): Vec3

// 世界坐标 → 屏幕坐标
function worldToScreen(worldPos: Vec3): Vec2
```

### 时间转换

```typescript
// 现实时间转游戏时间
// 原理: 1天现实时间 = 1分钟游戏时间
function RealTimeToGameTime(day: number): number {
    return day * 60; // 转换为分钟
}
```

---

## 配置文件格式

### crops.json 结构

```json
{
    "crops": [
        {
            "name": "作物名称",
            "id": 101,
            "matureTimes": 1,
            "tempLow": 0,
            "tempHigh": 30,
            "lifecycle": [
                {
                    "name": "阶段名",
                    "fuel": 0,
                    "water": 1,
                    "time": 5
                }
            ]
        }
    ]
}
```

---

*本文档详细描述了 FarmCreator 项目的所有公开 API 和使用方法*
