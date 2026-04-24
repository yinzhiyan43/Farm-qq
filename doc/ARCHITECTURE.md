# FarmCreator 架构设计文档

## 目录

- [系统架构概览](#系统架构概览)
- [核心组件关系](#核心组件关系)
- [数据流](#数据流)
- [游戏循环](#游戏循环)
- [状态机](#状态机)
- [设计模式](#设计模式)

---

## 系统架构概览

FarmCreator 采用组件化架构设计，基于 Cocos Creator 引擎的 ECS（Entity-Component-System）模式。

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Cocos Creator 3.8.x                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    游戏系统层 (Game System)                   │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │  │
│  │  │  Crop    │  │  Soil    │  │  Audio   │  │ Settings│  │  │
│  │  │  System  │  │  System  │  │  System  │  │ System  │  │  │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   数据层 (Data Layer)                        │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │  crops.json (JSON 配置)  │  LocalStorage (本地存储)     │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   资源层 (Resource Layer)                    │  │
│  │  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  │  │
│  │  │Audio│  │Crop │  │Effect│  │Farm │  │Map  │  │  │
│  │  └───────┘  └───────┘  └───────┘  └───────┘  └───────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   引擎层 (Engine Layer)                      │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │  Scene Management  │  TiledMap  │  Sprite System  │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 核心组件关系

### 组件依赖图

```
                    GameManager
                         |
         +---------------+---------------+
         |               |               |
    AudioController    Soil          Settings
         |               |
    +----+----+          |
    |         |          |
  Crop      Common       |
    |                    |
    +--------------------+
              |
         crops.json
```

### 组件说明

| 组件 | 依赖 | 被依赖 | 职责 |
|------|------|---------|------|
| GameManager | AudioController, Soil, Settings | 无 | 游戏入口，资源初始化 |
| AudioController | 无 | GameManager, Crop, Soil, brand | 音频管理 |
| Soil | Crop, AudioController | GameManager | 土地管理，用户交互 |
| Crop | Common | Soil | 作物生长逻辑 |
| Settings | 无 | GameManager | 游戏设置持久化 |
| Common | 无 | Crop | 通用工具，全局状态 |

---

## 数据流

### 作物生长数据流

```
┌─────────────────────────────────────────────────────────────────────┐
│                        作物生长数据流                              │
└─────────────────────────────────────────────────────────────────────┘

  crops.json
      |
      v
  CropData.deserializeAll()
      |
      v
  CropData[] 数组
      |
      +---> Soil.plantCrop() --→ CropNode
                              |
                              v
                    [Seed] --→ [Seeding] --→ [Growing] --→ [Flowering] --→ [Mature]
                              |               |               |               |
                              |               |               |               |
                              +---------------+---------------+---------------+
                                              |
                                              v
                                    checkGrowthProgress()
                                              |
                                              v
                                    环境检查 (水分/养料/温度/虫害)
                                              |
                                              v
                                    时间检查 (days >= lifecycle.Days)
                                              |
                                              v
                                    enterNextLifecycle() / harvest()
```

### 用户交互数据流

```
┌─────────────────────────────────────────────────────────────────────┐
│                        用户交互数据流                              │
└─────────────────────────────────────────────────────────────────────┘

  用户点击屏幕
       |
       v
  Soil.onTouchStart()
       |
       v
  getTilePos() 坐标转换
       |
       v
  判断点击位置类型
       |
       +--→ 土地瓦片 --→ 检查是否有作物
       |                     |
       |                     +--→ 有作物 --→ 成熟? --→ harvestCrop()
       |                     |              |
       |                     |              +--→ 未成熟 --→ 无操作
       |                     |
       |                     +--→ 无作物 --→ plantCrop()
       |
       +--→ 扩建牌 --→ expandLand() --→ updateExpandSign()
```

---

## 游戏循环

### 更新循环

```
┌─────────────────────────────────────────────────────────────────────┐
│                        游戏更新循环                              │
└─────────────────────────────────────────────────────────────────────┘

  [Game Loop Start]
         |
         v
  +------------------+
  |  处理用户输入    |  ←-- 键盘/鼠标/触摸事件
  +------------------+
         |
         v
  +------------------+
  |  更新游戏逻辑    |  ←-- 作物生长更新
  +------------------+
         |
         v
  +------------------+
  |  渲染画面       |  ←-- 精灵更新/动画播放
  +------------------+
         |
         v
  +------------------+
  |  播放音效       |  ←-- 根据事件播放音效
  +------------------+
         |
         v
  [Loop to Start]
```

### 作物更新定时器

每个作物节点拥有独立的更新逻辑：

```typescript
// 在 CropNode 类中
update() {
    // 检查是否需要更新生长状态
    this.checkGrowthProgress();
}

// 或使用定时器
schedule(callback: () => void, interval: number) {
    // 每隔 interval 秒执行一次
}
```

---

## 状态机

### 作物状态机

```
                    +-----------+
                    |   Seed    |
                    |  (种子期)  |
                    +-----+-----+
                          |
                          | 发芽
                          v
                    +-----------+
                    |  Seeding  |
                    |  (发芽期)  |
                    +-----+-----+
                          |
                          | 生长
                          v
                    +-----------+
                    |  Growing  |
                    |  (生长期)  |
                    +-----+-----+
                          |
                          | 开花
                          v
                    +-----------+
               +---| Flowering |
               |   |  (开花期)  |
               |   +-----+-----+
               |         |
               |         | 结果
               |         v
               |   +-----------+
               |   |Fructifying|
               |   |  (结果期)  |
               |   +-----+-----+
               |         |
               |         | 成熟
               |         v
               |   +-----------+
               +-->|  Mature   |
                   |  (成熟期)  |
                   +-----+-----+
                         |
                         | 收获
                         v
                   +-----------+
                   |  Harvest  |
                   |  (收获期)  |
                   +-----+-----+
                         |
            +------------+------------+
            |                         |
            | 单次收获作物              | 多年生作物
            | (matureTimes=1)         | (matureTimes=-1)
            |                         |
            v                         v
      +-----------+             +-----------+
      |   Dead    |             |  Growing  | ←-- 循环回到生长期
      |  (死亡)   |             |  (再生长)  |
      +-----------+             +-----------+
```

### 土地状态机

```
+-----------+     开垦      +-----------+
|  Nothing  | --------------> |   Virgin  |
| (无土地)   |                |  (未开垦)  |
+-----------+                +-----+-----+
                                     |
                                     | 浇水/施肥
                                     v
                               +-----------+
                               |    Dry    |
                               |  (干燥)   |
                               +-----+-----+
                                     |
                                     | 浇水
                                     v
                               +-----------+
                               |  DryHalf  |
                               |  (半干)   |
                               +-----+-----+
                                     |
                                     | 施肥
                                     v
                               +-----------+
                               |  FatHalf  |
                               |  (半肥)   |
                               +-----+-----+
                                     |
                                     | 浇水+施肥
                                     v
                               +-----------+
                               |    Fat    |
                               |  (肥沃)   |
                               +-----------+
```

---

## 设计模式

### 1. 单例模式 (Singleton)

**应用**: Settings

```typescript
export class Settings extends Component {
    private static _instance: Settings = null;
    
    public static getInstance(): Settings {
        if (this._instance == null) {
            this._instance = new Settings();
        }
        return this._instance;
    }
}
```

**优点**:
- 确保全局只有一个设置实例
- 统一管理游戏配置

### 2. 组件模式 (Component Pattern)

**应用**: 所有游戏对象

```typescript
@ccclass('CropNode')
export class CropNode extends Component {
    // 组件属性
    @property(CropData)
    cropData: CropData = null;
    
    // 组件方法
    update() {
        // 每帧更新
    }
}
```

**优点**:
- 模块化设计
- 可复用、可组合
- 与引擎紧密集成

### 3. 数据驱动 (Data-Driven)

**应用**: 作物系统

```typescript
// 配置数据 (crops.json)
{
    "name": "白萝卜",
    "id": 101,
    "lifecycle": [...]
}

// 代码使用配置
const cropData = CropData.deserializeAll(jsonData);
const crop = new CropNode(cropData[0]);
```

**优点**:
- 作物数据与逻辑分离
- 方便策划调整
- 无需修改代码即可添加新作物

### 4. 观察者模式 (Observer Pattern)

**应用**: 事件系统

```typescript
// 注册观察者
this.node.on('harvest', this.onHarvest, this);

// 触发事件
this.node.emit('harvest', cropData);

// 取消注册
this.node.off('harvest', this.onHarvest, this);
```

**优点**:
- 解耦事件发生者与接收者
- 支持多观察者

### 5. 工厂模式 (Factory Pattern)

**应用**: 作物创建

```typescript
class CropFactory {
    static createCrop(cropId: number): CropNode {
        const data = CropData.getById(cropId);
        const crop = new CropNode();
        crop.init(data);
        return crop;
    }
}
```

**优点**:
- 封装创建逻辑
- 统一创建入口

### 6. 状态模式 (State Pattern)

**应用**: 作物生长状态

```typescript
enum CropState {
    Seed, Seeding, Growing, Flowering, Mature, Dead
}

class CropNode {
    private currentState: CropState;
    
    update() {
        switch(this.currentState) {
            case CropState.Growing:
                this.handleGrowing();
                break;
            case CropState.Mature:
                this.handleMature();
                break;
            // ...
        }
    }
}
```

**优点**:
- 清晰的状态转换
- 易于扩展新状态

---

## 性能考虑

### 资源管理

1. **图集优化**
   - 使用 TexturePacker 打包精灵图
   - 减少 Draw Call
   - 统一管理精灵资源

2. **对象池**
   - 预创建作物节点
   - 重复利用死亡作物对象

3. **懒加载**
   - 按需加载音频资源
   - 场景切换时释放无用资源

### 更新优化

1. **增量更新**
   - 只更新发生变化的作物
   - 避免每帧遍历所有作物

2. **时间精度控制**
   - 使用游戏时间而非现实时间
   - 降低更新频率

---

*本文档详细描述了 FarmCreator 的系统架构设计和核心机制*
