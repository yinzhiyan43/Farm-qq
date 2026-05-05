# FarmCreator 开发指南

## 目录

- [环境搭建](#环境搭建)
- [项目结构](#项目结构)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [调试技巧](#调试技巧)
- [扩展开发](#扩展开发)

---

## 环境搭建

### 必需工具

1. **Cocos Creator 3.8.7**
   - 下载地址: https://www.cocos.com/creator
   - 安装后启动编辑器
   - 选择"打开项目" → 导航到 FarmCreator 文件夹

2. **Visual Studio Code** (推荐)
   - 下载地址: https://code.visualstudio.com/
   - 安装 Cocos Creator 插件以获得最佳开发体验

3. **Tiled Map Editor** (地图编辑)
   - 下载地址: https://www.mapeditor.org/
   - 用于编辑 farm.tmx 地图文件

4. **TexturePacker** (图集制作)
   - 下载地址: https://www.codeandweb.com/texturepacker
   - 用于制作作物精灵图集

### 可选工具

- **TextureUnpacker**: 碎图提取工具
- **Chrome DevTools**: Web 预览调试

---

## 项目结构

### 目录说明

```
FarmCreator/
├── assets/                  # 游戏资源目录
│   ├── ts/                  # TypeScript 代码
│   │   ├── GameManager.ts   # 游戏入口
│   │   ├── Crop.ts          # 作物系统
│   │   ├── soil.ts          # 土地系统
│   │   ├── AudioController.ts # 音频管理
│   │   ├── Settings.ts      # 游戏设置
│   │   ├── Common.ts        # 工具类
│   │   ├── Shop.ts          # 商店系统
│   │   ├── Storehouse.ts    # 仓库系统
│   │   ├── cloud.ts         # 云朵动画
│   │   ├── fireworks.ts     # 烟花效果
│   │   ├── brand.ts         # 品牌交互
│   │   └── global.d.ts      # 类型声明
│   ├── resources/           # 游戏资源
│   │   ├── audio/           # 音频文件
│   │   ├── crop/            # 作物图集
│   │   ├── data/            # 配置数据
│   │   ├── effect/          # 特效资源
│   │   ├── farmUI/          # UI素材
│   │   ├── map/             # 地图资源
│   │   └── sanguo/          # 三国资源
│   ├── animation/           # 动画资源
│   ├── prefab/              # 预制体
│   ├── MainScene.scene      # 主场景
│   └── BootScene.scene      # 启动场景
├── profiles/              # 编辑器配置
├── settings/              # 项目设置
├── package.json           # 项目配置
└── tsconfig.json          # TypeScript配置
```

### 关键文件说明

| 文件路径 | 说明 |
|---------|------|
| assets/ts/Crop.ts | 作物系统核心，定义作物生长逻辑 |
| assets/ts/soil.ts | 土地系统，处理瓦片地图和用户交互 |
| assets/resources/data/crops.json | 作物配置数据 |
| assets/resources/map/farm.tmx | Tiled 地图文件 |

---

## 开发流程

### 新增作物流程

1. **准备精灵图**
   ```
   作物图片 → TexturePacker → crop.plist + crop.png
   ```

2. **更新配置文件**
   编辑 `assets/resources/data/crops.json`
   ```json
   {
       "name": "新作物",
       "id": 116,
       "matureTimes": 1,
       "tempLow": 10,
       "tempHigh": 30,
       "lifecycle": [
           {"name": "种子期", "fuel": 0, "water": 1, "time": 3},
           {"name": "幼苗期", "fuel": 1, "water": 1, "time": 5},
           {"name": "成熟期", "fuel": 0, "water": 0, "time": 7}
       ]
   }
   ```

3. **更新图集**
   确保精灵命名符合规范：`crop_{id}_0{stage}`
   例如：`crop_116_01`, `crop_116_02`, `crop_116_03`

4. **测试验证**
   - 启动游戏
   - 验证新作物能正常显示和生长

### 新增地图功能

1. **编辑地图**
   使用 Tiled Map Editor 打开 `assets/resources/map/farm.tmx`

2. **修改图层**
   - 添加/删除瓦片
   - 设置瓦片属性

3. **更新代码**
   在 `soil.ts` 中添加新的交互逻辑

4. **测试验证**
   - 验证地图显示正确
   - 验证新功能正常工作

---

## 代码规范

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 类名 | PascalCase | `CropNode`, `GameManager` |
| 方法名 | camelCase | `getTilePos()`, `harvestCrop()` |
| 属性名 | camelCase | `cropData`, `currentState` |
| 私有属性 | 下划线前缀 | `_instance`, `_currentLifecycle` |
| 常量 | 全大写 | `MAX_CROP_ID`, `DEFAULT_LIFECYCLE` |
| 枚举 | 全大写 | `CropState`, `LandState` |

### 文件组织

```typescript
// 1. 导入语句
import { _decorator, Component, Node, Vec2 } from 'cc';

// 2. 装饰器
const { ccclass, property } = _decorator;

// 3. 类定义
@ccclass('ClassName')
export class ClassName extends Component {
    // 4. 属性声明
    @property(Node)
    nodeRef: Node = null;
    
    // 5. 私有属性
    private _privateVar: number = 0;
    
    // 6. 生命周期方法
    onLoad() {
        // 初始化逻辑
    }
    
    start() {
        // 启动逻辑
    }
    
    update(deltaTime: number) {
        // 每帧更新
    }
    
    // 7. 公共方法
    publicMethod(): void {
        // 公共方法实现
    }
    
    // 8. 私有方法
    private _privateMethod(): void {
        // 私有方法实现
    }
}
```

### 注释规范

```typescript
/**
 * 类功能说明
 * @author 作者名
 * @date 创建日期
 */
@ccclass('CropNode')
export class CropNode extends Component {
    /** 作物配置数据 */
    @property(CropData)
    cropData: CropData = null;
    
    /**
     * 初始化作物节点
     * @param data 作物配置数据
     * @param soil 所在土地
     */
    init(data: CropData, soil: Soil): void {
        // 实现逻辑
    }
}
```

---

## 调试技巧

### 日志输出

```typescript
// 普通日志
console.log('Debug message');

// 警告日志
console.warn('Warning message');

// 错误日志
console.error('Error message');

// 对象输出
console.log('Crop data:', JSON.stringify(cropData));
```

### 浏览器调试

1. 在 Cocos Creator 中点击"预览"
2. 按 F12 打开开发者工具
3. 在 Console 面板查看日志
4. 在 Sources 面板设置断点

### VS Code 调试

1. 安装 Cocos Creator 插件
2. 配置 launch.json
3. 使用 F5 启动调试

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 精灵不显示 | 资源路径错误 | 检查 resources 路径 |
| 作物不生长 | 未调用 update | 确保 schedule 启动 |
| 点击无响应 | 事件未注册 | 检查 on 函数调用 |
| 音频不播放 | 音频未加载 | 检查 AudioClip 引用 |

---

## 扩展开发

### 添加新系统

以添加"天气系统"为例：

1. **创建新文件**
   `assets/ts/Weather.ts`

2. **实现基础结构**
   ```typescript
   import { _decorator, Component } from 'cc';
   const { ccclass, property } = _decorator;
   
   @ccclass('Weather')
   export class Weather extends Component {
       @property
       currentWeather: WeatherType = WeatherType.Sunny;
       
       onLoad() {
           this.schedule(this.updateWeather, 60); // 每60秒更新
       }
       
       updateWeather() {
           // 天气更新逻辑
       }
   }
   ```

3. **挂载到场景**
   - 在 MainScene 中创建新节点
   - 挂载 Weather 组件

4. **与现有系统交互**
   ```typescript
   // 在 Crop.ts 中引用
   import { Weather } from './Weather';
   
   // 根据天气调整生长速度
   checkGrowthProgress() {
       const weather = Weather.getInstance().currentWeather;
       if (weather === WeatherType.Rainy) {
           // 下雨时生长加速
       }
   }
   ```

### 添加新场景

1. **创建场景文件**
   在 assets 目录下创建 `NewScene.scene`

2. **编辑场景内容**
   - 添加背景
   - 添加游戏对象
   - 配置相机

3. **场景切换**
   ```typescript
   import { director } from 'cc';
   
   // 跳转到新场景
   director.loadScene('NewScene');
   
   // 带过场动画的切换
   director.loadScene('NewScene', () => {
       console.log('场景加载完成');
   });
   ```

### 添加新资源类型

1. **音频资源**
   - 将音频文件放入 `assets/resources/audio/`
   - 在 AudioController 中添加引用

2. **图片资源**
   - 将图片放入相应目录
   - 使用 Sprite 组件显示

3. **动画资源**
   - 创建 AnimationClip
   - 编辑关键帧动画
   - 挂载到节点

---

## 构建发布

### Web 平台

1. 菜单栏: **项目 → 构建发布**
2. 发布平台: 选择 **Web Mobile** 或 **Web Desktop**
3. 配置选项:
   - 压缩类型: 建议选择 **Gzip** 或 **Brotli**
   - MD5 Cache: 开启（用于缓存突破）
4. 点击"构建"
5. 构建完成后打开构建目录测试

### 移动端平台

1. 发布平台: 选择 **Android** 或 **iOS**
2. 配置签名和证书
3. 配置启动图和图标
4. 点击"构建"

### 构建目录结构

```
build/
├── web-mobile/          # Web 构建输出
│   ├── index.html
│   ├── main.js
│   ├── assets/            # 资源文件
│   └── ...
└── android/             # Android 构建输出
    └── ...
```

---

## 版本控制

### Git 工作流

```bash
# 初始化仓库
git init

# 添加远程仓库
git remote add origin <repository-url>

# 提交更改
git add .
git commit -m "feat: 添加新功能"

# 推送到远程
git push origin main
```

### 提交规范

| 前缀 | 说明 |
|------|------|
| feat: | 新功能 |
| fix: | 修复 bug |
| docs: | 文档更新 |
| style: | 代码格式 |
| refactor: | 重构代码 |
| perf: | 性能优化 |
| test: | 测试代码 |
| chore: | 构建流程 |

---

*本文档提供了 FarmCreator 项目的完整开发指南*
