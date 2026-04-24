# FarmCreator 项目文档

## 项目概述

FarmCreator 是一个基于 **Cocos Creator 3.8.x** 开发的农场类游戏 Demo，采用 TypeScript 编写。该项目展示了农场游戏的核心玩法机制，包括作物种植、生长周期管理、土地扩建、环境交互等功能。

### 项目特点

- **引擎版本**: Cocos Creator 3.8.7 (最新升级)
- **开发语言**: TypeScript
- **游戏类型**: 2D 农场模拟经营
- **目标平台**: Web (H5小游戏)、移动端

---

## 功能特性

### 核心玩法

1. **作物种植系统**
   - 15种不同作物（白萝卜、胡萝卜、玉米、土豆、茄子、番茄、豌豆、辣椒、南瓜、草莓、西瓜、榴莲等）
   - 每种作物拥有独立的生长周期配置
   - 支持多年生作物（如辣椒、草莓、榴莲等可多次收获）

2. **作物生长机制**
   - 完整的生命周期：种子期 → 幼苗期 → 生长期 → 开花期 → 成熟期 → 收获期
   - 环境因素模拟：温度、水分、养料、虫害影响作物生长
   - 时间加速机制：现实时间转换为游戏时间（天→分钟）

3. **土地管理系统**
   - 基于 TiledMap 的瓦片地图系统
   - 土地扩建机制：点击"扩建牌"逐步解锁新土地
   - 自动初始化2行作物，支持动态扩展

4. **交互功能**
   - 点击成熟作物自动收获
   - 点击死亡作物铲除重种
   - 点击扩建牌扩展土地

### 视觉效果

1. **动画效果**
   - 飘云动画（循环移动+淡入淡出）
   - 烟花特效（点击标题触发）
   - 飞鸟动画（序列帧动画）

2. **UI界面**
   - 农场主场景（土地、作物）
   - 商店入口（点击音效）
   - 仓库入口（点击音效）
   - 设置面板（音效/背景音乐开关）

3. **音效系统**
   - 背景音乐（BGM）
   - 点击音效
   - 扩建音效
   - 铲除音效
   - 收获音效
   - 烟花音效

---

## 项目结构

```
FarmCreator/
├── assets/                          # 资源目录
│   ├── ts/                          # TypeScript 脚本
│   │   ├── GameManager.ts           # 游戏管理器（场景切换、资源初始化）
│   │   ├── Crop.ts                  # 作物系统（核心逻辑）
│   │   ├── soil.ts                  # 土地系统（TiledMap管理）
│   │   ├── Common.ts                # 通用工具类
│   │   ├── AudioController.ts       # 音频控制器
│   │   ├── Settings.ts              # 游戏设置（本地存储）
│   │   ├── Shop.ts                  # 商店功能
│   │   ├── Storehouse.ts            # 仓库功能
│   │   ├── cloud.ts                 # 云朵动画
│   │   ├── fireworks.ts             # 烟花动画
│   │   ├── brand.ts                 # 标题品牌（触发烟花）
│   │   └── global.d.ts              # 全局类型声明
│   ├── resources/                   # 游戏资源
│   │   ├── audio/                   # 音频文件
│   │   ├── crop/                    # 作物图集（plist/png）
│   │   ├── data/                    # 数据配置
│   │   │   └── crops.json           # 作物配置数据
│   │   ├── effect/                  # 特效资源
│   │   │   ├── bird/                # 飞鸟动画
│   │   │   ├── cloud/               # 云朵图片
│   │   │   └── yanhua/              # 烟花图片
│   │   ├── farmUI/                  # 农场UI资源
│   │   ├── map/                     # 地图资源
│   │   │   ├── farm.tmx             # Tiled地图文件
│   │   │   └── farm_soil_tiles.png  # 土地瓦片图
│   │   └── sanguo/                  # 三国风格资源
│   ├── animation/                   # 动画资源
│   ├── prefab/                      # 预制体
│   ├── MainScene.scene              # 主场景
│   └── BootScene.scene              # 启动场景
├── profiles/                        # 编辑器配置
├── settings/                        # 项目设置
├── package.json                     # 项目配置
└── tsconfig.json                    # TypeScript配置
```

---

## 核心模块详解

### 1. GameManager.ts - 游戏管理器

**职责**: 场景管理、资源预加载

**主要功能**:
- 预加载 MainScene 场景
- 异步初始化作物数据（CropData.deserializeAll）
- 资源加载完成后切换场景

**代码示例**:
```typescript
async onLoad() {
    director.preloadScene("MainScene", async () => {
        await this.initialize();  // 初始化资源
        director.loadScene("MainScene");
    });
}
```

---

### 2. Crop.ts - 作物系统

**职责**: 作物数据定义、生长逻辑、状态管理

**核心类**:

#### CropLifecycle - 作物生命周期
```typescript
class CropLifecycle {
    Name: string;      // 阶段名称（如"幼苗期"）
    Fuel: number;      // 所需养料
    Water: number;     // 所需水分
    Days: number;      // 持续时间（天）
}
```

#### CropData - 作物数据
```typescript
class CropData {
    CropName: string;           // 作物名称
    CropId: number;             // 作物ID（101-115）
    TempLow/TempHigh: number;   // 温度范围
    HarvestMaxTimes: number;    // 最大收获次数（-1为无限）
    Lifecycles: CropLifecycle[];// 生命周期数组
}
```

#### CropNode - 作物节点
**状态枚举**:
```typescript
enum CropState {
    Seed = 0,       // 种子
    Seeding = 1,    // 发芽
    Growing = 2,    // 生长
    GrowingEx = 3,  // 再生长
    Flowering = 4,  // 开花
    Fructifying = 5,// 结果
    Mature = 999,   // 成熟
    Dead = 1000     // 死亡
}
```

**生长逻辑**:
- 检查环境条件（水分、养料、温度、虫害）
- 根据时间推进生命周期
- 成熟后自动或手动收获
- 支持多年生作物循环生长

---

### 3. soil.ts - 土地系统

**职责**: 土地管理、作物种植、用户交互

**核心功能**:

#### 土地状态
```typescript
enum LandState {
    Nothing = 0,    // 无土地
    Virgin = 1,     // 未开垦
    Dry = 2,        // 干燥
    DryHalf = 3,    // 半干
    FatHalf = 4,    // 半肥
    Fat = 5         // 肥沃
}
```

#### 瓦片坐标转换
```typescript
getTilePos(localClickPos: Vec3): Vec2 {
    // 将屏幕点击坐标转换为瓦片地图坐标
    const tileX = Math.floor((layerSize.height - y + x) / 2);
    const tileY = Math.floor((layerSize.height - y - x) / 2);
    return new Vec2(tileX, tileY);
}
```

#### 扩建机制
- 初始化显示"扩建牌"在 (0, 2) 位置
- 点击后解锁当前土地并种植作物
- 自动移动到下一个可扩建位置
- 支持横向优先、纵向次之的扩建顺序

---

### 4. AudioController.ts - 音频控制器

**职责**: 背景音乐和音效管理

**功能列表**:
| 方法 | 说明 |
|------|------|
| playBGM() | 播放背景音乐 |
| pauseBGM() | 暂停背景音乐 |
| stopBGM() | 停止背景音乐 |
| playSoundClick() | 播放点击音效 |
| playSoundExtand() | 播放扩建音效 |
| playSoundWipe() | 播放铲除音效 |
| playSoundGather() | 播放收获音效 |
| playSoundFireworks() | 播放烟花音效 |

---

### 5. Settings.ts - 游戏设置

**职责**: 本地存储管理、游戏配置持久化

**存储项**:
- `soundEffectSwitch`: 音效开关（0/1）
- `bgmSwitch`: 背景音乐开关（0/1）

**API**:
```typescript
getSoundEffectSwitch(): boolean
getBGMSwitch(): boolean
SwitchSoundEffect(toggle: boolean)
SwitchBGM(toggle: boolean)
```

---

### 6. Common.ts - 通用工具

**职责**: 全局变量、通用方法

**功能**:
```typescript
// 随机数生成 [min, max]
static getRandomNumber(min: number, max: number): number

// 现实时间转游戏时间（天->分钟）
static RealTimeToGameTime(day: number): number

// 异步加载资源
static async loadResourceAsync<T>(path: string, type: typeof Asset): Promise<T>
```

**全局实例**:
```typescript
export let common: Common = new Common();
```

**自然环境类**:
```typescript
class NaturalEnv {
    Temperature: number;  // 气温
    Water: number;        // 水分
    Fuel: number;         // 养料
    Bug: number;          // 虫害
    Light: number;        // 光照
    Wind: number;         // 风力
}
```

---

## 作物配置说明

作物数据存储在 `assets/resources/data/crops.json`，采用 JSON 格式配置。

### 配置示例

```json
{
    "name": "白萝卜",
    "id": 101,
    "matureTimes": 1,
    "tempLow": 2,
    "tempHigh": 25,
    "lifecycle": [
        {"name": "种子期", "fuel": 0, "water": 1, "time": 3},
        {"name": "幼苗期", "fuel": 1, "water": 1, "time": 7},
        {"name": "生长期", "fuel": 1, "water": 1, "time": 10},
        {"name": "成熟期", "fuel": 0, "water": 0, "time": 10},
        {"name": "收获期", "fuel": 0, "water": 0, "time": 10}
    ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 作物名称 |
| id | number | 作物唯一ID（101-115） |
| matureTimes | number | 最大收获次数（1=单次，-1=无限次） |
| tempLow | number | 最低生长温度 |
| tempHigh | number | 最高生长温度 |
| lifecycle | array | 生长阶段数组 |

### 生命周期字段

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 阶段名称 |
| fuel | number | 所需养料 |
| water | number | 所需水分 |
| time | number | 持续时间（天） |

### 作物列表

| ID | 名称 | 收获次数 | 特点 |
|----|------|----------|------|
| 101 | 白萝卜 | 1 | 基础作物 |
| 102 | 胡萝卜 | 1 | 基础作物 |
| 103 | 玉米 | 1 | 有开花期 |
| 104 | 土豆 | 1 | 有开花期 |
| 105 | 茄子 | 1 | 有开花期 |
| 106 | 番茄 | 1 | 有开花期 |
| 107 | 豌豆 | 1 | 有开花期 |
| 108 | 辣椒 | -1 | **多年生** |
| 109 | 南瓜 | 1 | 有开花期 |
| 110 | 草莓 | -1 | **多年生** |
| 111 | 西瓜 | 2 | 两次收获 |
| 112 | 榴莲 | -1 | **多年生**，耐高温 |
| 113-115 | 其他作物 | - | 扩展预留 |

---

## 技术要点

### 1. 瓦片地图（TiledMap）

- 使用 Tiled Map Editor 编辑地图
- 正交视角（Orthogonal）瓦片地图
- 坐标转换：屏幕坐标 ↔ 瓦片坐标
- 动态修改瓦片GID实现土地状态变化

### 2. 图集（SpriteAtlas）

- 使用 TexturePacker 制作图集
- 作物精灵帧命名规范：`crop_{id}_0{stage}`
- 统一加载和管理精灵资源

### 3. 组件化设计

- 每个功能模块独立成类
- 使用 Cocos Creator 装饰器（@ccclass, @property）
- 事件驱动架构（TOUCH_START 等）

### 4. 异步资源加载

```typescript
// 使用 Promise 封装资源加载
const asset = await Common.loadResourceAsync<JsonAsset>(path, JsonAsset);
```

### 5. 本地存储

```typescript
// 使用 sys.localStorage 持久化配置
sys.localStorage.setItem("key", value);
sys.localStorage.getItem("key");
```

---

## 开发环境

### 必需工具

1. **Cocos Creator 3.8.7** (或更高版本)
   - 下载地址: https://www.cocos.com/creator

2. **Tiled Map Editor** (地图编辑)
   - 下载地址: https://www.mapeditor.org/

3. **TexturePacker** (图集制作)
   - 下载地址: https://www.codeandweb.com/texturepacker

### 可选工具

- **TextureUnpacker** (碎图提取)
- **VS Code** (代码编辑，推荐安装 Cocos Creator 插件)

---

## 运行项目

### 步骤

1. 打开 Cocos Creator 编辑器
2. 选择"打开项目"，导航到 FarmCreator 文件夹
3. 等待编辑器加载资源
4. 点击顶部"预览"按钮运行游戏

### 构建发布

1. 菜单栏选择 **项目 → 构建发布**
2. 选择目标平台（Web Mobile / Web Desktop）
3. 配置构建参数
4. 点击"构建"

---

## 更新历史

### 2025-08-19
- 升级到 Cocos Creator 3.8.7
- 将资源初始化操作放到 GameManager 中加载
- 在 Canvas 根节点挂载背景音乐解决初始界面无音效问题

### 2025-05-20
- 升级到 Cocos Creator 3.8.6

### 2025-03-25
- 升级到 Cocos Creator 3.8.5
- 解决坐标偏移硬编码问题

### 2023-12-07
- 升级到 Cocos Creator 3.8.1
- 增加背景音乐和音效
- 作物成熟期间可手工点击采摘
- 超时自动采摘并进入下一生长周期

### 2023-11-28
- 硬编码纠正坐标
- 启动时初始化2行土地
- 点击"扩展牌"扩展新土地
- 增加作物配置 JSON 文件
- 作物自动生长，支持多年生作物

---

## 参考资源

### 参考项目
- [SDL农场游戏开发](https://github.com/sky94520/Farm/tree/Farm-09)
- [pasture - cocos-creator农场游戏](https://github.com/shockingsrose/pasture)

### 相关教程
- [Cocos Creator使用汇总](https://zhupite.com/program/cocos-creator-summary.html)
- [cocos编写农场偷菜小游戏的总结](https://blog.csdn.net/asmcvc/article/details/105641708)

---

## 版权声明

本项目为学习研究用途的 Demo 项目。

- 部分碎图及资源来自 [SDL农场游戏开发](https://github.com/sky94520/Farm/tree/Farm-09)
- 部分资源来自老版本率土之滨（仅供学习研究）
- 如侵权请告知，将在第一时间删除

---

## 作者信息

- **作者**: bigsinger
- **项目地址**: https://github.com/bigsinger/Farm
- **博客**: https://blog.csdn.net/asmcvc

---

*本文档由 AI 助手生成，基于 FarmCreator 项目源码分析*
