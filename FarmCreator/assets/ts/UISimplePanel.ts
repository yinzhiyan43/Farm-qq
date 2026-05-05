import { _decorator, Component, Node, Label, Color, Sprite, SpriteFrame, Texture2D, UITransform, Layers, Vec3, Overflow, UIOpacity, tween, ScrollView, Layout, Scrollbar, Mask, Graphics, Vec2, Size } from 'cc';
import { ShopManager, ShopItem } from './ShopManager';
import { WarehouseManager, WarehouseItem } from './WarehouseManager';
import { CurrencySystem } from './CurrencySystem';
import { SaveManager } from './SaveManager';
import { eventBus, GameEvent } from './EventBus';
const { ccclass, property } = _decorator;
/**
* 背包式UI面板 - 商店/仓库/存档管理
* 网格布局，游戏背包风格
*/
@ccclass('UISimplePanel')
export class UISimplePanel extends Component {
private isShop: boolean = true;
private isSavePanel: boolean = false;
private gridNode: Node = null;
private scrollView: ScrollView = null;
private layout: Layout = null;
private sortBarNode: Node = null;
private tabContainer: Node = null;
private goldLabel: Label = null;
private titleLabel: Label = null;
private infoLabel: Label = null;
private isEventsRegistered: boolean = false;
private panelBody: Node = null;
    private currentWarehouseTab: string = 'all';
    private currentWarehouseSort: string = 'all';
private detailPopup: Node = null;
private detailQuantity: number = 1;
private detailMaxQuantity: number = 99;
private detailQtyLabel: Label = null;
private detailTotalLabel: Label = null;
private selectedCell: Node = null;
private selectedHighlight: Node = null;
private readonly COLS = 5;
private readonly CELL_SIZE = 120;
private readonly CELL_GAP = 12;
private readonly PANEL_W = 820;
private readonly PANEL_H = 620;
private readonly GRID_PADDING = 15;
// ==================== 墨绿色背包色板 ====================
private readonly C_LEATHER_BG = new Color(18, 52, 28, 252);
private readonly C_LEATHER_DARK = new Color(12, 36, 18, 255);
private readonly C_LEATHER_MID = new Color(28, 62, 36, 255);
private readonly C_BORDER = new Color(48, 108, 50, 255);
private readonly C_CELL_SLOT = new Color(30, 55, 34, 255);
private readonly C_TAB_ACTIVE = new Color(52, 105, 52, 255);
private readonly C_TAB_INACTIVE = new Color(24, 46, 26, 255);
private readonly C_SCROLL_BG = new Color(16, 32, 18, 80);
private readonly C_SCROLL_HANDLE = new Color(88, 152, 68, 200);
// 作物颜色映射
private readonly CROP_COLORS: Record<number, Color> = {
101: new Color(240, 240, 240, 255),
102: new Color(255, 140, 50, 255),
103: new Color(255, 220, 50, 255),
104: new Color(180, 140, 80, 255),
105: new Color(140, 60, 180, 255),
106: new Color(220, 50, 50, 255),
107: new Color(255, 180, 100, 255),
108: new Color(80, 160, 220, 255),
109: new Color(255, 120, 160, 255),
110: new Color(220, 200, 80, 255),
111: new Color(255, 80, 80, 255),
112: new Color(120, 200, 80, 255),
113: new Color(200, 160, 255, 255),
114: new Color(100, 220, 180, 255),
115: new Color(255, 140, 60, 255),
116: new Color(200, 80, 120, 255),
117: new Color(80, 160, 80, 255),
118: new Color(180, 140, 255, 255),
119: new Color(255, 180, 60, 255),
120: new Color(80, 180, 80, 255),
};
// 作物图标映射
private readonly CROP_ICONS: Record<number, string> = {
101: '🥕', 102: '🥕', 103: '🌽', 104: '🥔', 105: '🍆',
106: '🍅', 107: '🧅', 108: '🫐', 109: '🍓', 110: '🌶️',
111: '🍎', 112: '🥒', 113: '🍇', 114: '🥬', 115: '🎃',
116: '🍒', 117: '🥦', 118: '🫛', 119: '🌻', 120: '🥬',
};
// 作物名称映射
private readonly CROP_NAMES: Record<number, string> = {
101: '白萝卜', 102: '胡萝卜', 103: '玉米', 104: '土豆', 105: '茄子',
106: '番茄', 107: '洋葱', 108: '蓝莓', 109: '草莓', 110: '辣椒',
111: '苹果', 112: '黄瓜', 113: '葡萄', 114: '西瓜', 115: '南瓜',
116: '樱桃', 117: '西兰花', 118: '豌豆', 119: '向日葵', 120: '青菜',
};
// 稀有度颜色
private readonly RARITY_COLORS = {
common: new Color(150, 150, 150, 255),
uncommon: new Color(50, 200, 50, 255),
rare: new Color(50, 100, 255, 255),
epic: new Color(180, 50, 255, 255),
legendary: new Color(255, 170, 0, 255),
};
private getRarityColor(level: number): Color {
if (level >= 9) return this.RARITY_COLORS.legendary;
if (level >= 7) return this.RARITY_COLORS.epic;
if (level >= 5) return this.RARITY_COLORS.rare;
if (level >= 3) return this.RARITY_COLORS.uncommon;
return this.RARITY_COLORS.common;
}
// ==================== 生命周期 ====================
private currentShopTab: string = 'unlocked';
onLoad() {
this.createBaseUI();
}
/** 外部调用：以商店模式打开 */
public openAsShop() {
this.initShop();
}
/** 外部调用：以仓库模式打开 */
public openAsWarehouse() {
this.initWarehouse();
}
/** 外部调用：以存档模式打开 */
public openAsSavePanel() {
this.initSavePanel();
}
/** UIManager 调用：以商店模式打开（兼容旧接口） */
public initShop() {
this.isShop = true;
this.isSavePanel = false;
if (this.titleLabel) {
this.titleLabel.string = '商店';
}
this.scheduleOnce(() => {
this.refreshShopContent();
this.updateGoldDisplay();
}, 0.1);
}
/** UIManager 调用：以仓库模式打开 */
public initWarehouse() {
this.isShop = false;
this.isSavePanel = false;
if (this.titleLabel) {
this.titleLabel.string = '仓库';
}
this.scheduleOnce(() => {
this.refreshWarehouseContent();
this.updateGoldDisplay();
}, 0.1);
}
public initSavePanel() {
this.isSavePanel = true;
if (this.titleLabel) {
this.titleLabel.string = '存档';
}
this.scheduleOnce(() => this.refreshSavePanelContent(), 0.1);
}
// ==================== 基础UI创建 ====================
private createBaseUI() {
// 全屏遮罩
const maskNode = this.makeNode('Mask', 2000, 2000, new Color(0, 0, 0, 180), 0, 0, 0);
maskNode.parent = this.node;
maskNode.on(Node.EventType.TOUCH_START, (e: any) => { e.propagationStopped = true; }, this);
maskNode.on(Node.EventType.TOUCH_END, (e: any) => { e.propagationStopped = true; this.close(); }, this);
// 主面板（墨绿色底色）
const panelNode = this.makeNode('Panel', this.PANEL_W, this.PANEL_H, this.C_LEATHER_BG, 0, 0, 1);
panelNode.parent = this.node;
this.panelBody = panelNode;
panelNode.on(Node.EventType.TOUCH_START, (e: any) => { e.propagationStopped = true; }, this);
// 头部
const headerH = 70;
// 标题
const titleNode = this.makeLabel('Title', '商店', 36, new Color(255, 220, 100, 255));
titleNode.setPosition(0, this.PANEL_H / 2 - headerH / 2 - 5, 2);
titleNode.parent = panelNode;
this.titleLabel = titleNode.getComponent(Label);
// 金币
const goldNode = this.makeLabel('Gold', '💰 0', 24, new Color(255, 215, 0, 255));
goldNode.setPosition(this.PANEL_W / 2 - 140, this.PANEL_H / 2 - headerH / 2 - 5, 2);
goldNode.parent = panelNode;
this.goldLabel = goldNode.getComponent(Label);
// 关闭按钮
const closeBtn = this.makeNode('CloseBtn', 60, 40, new Color(180, 50, 50, 255), this.PANEL_W / 2 - 55, this.PANEL_H / 2 - headerH / 2 - 5, 2);
closeBtn.parent = panelNode;
const closeLbl = this.makeLabel('X', '✕', 28, Color.WHITE);
closeLbl.setPosition(0, 0, 3);
closeLbl.parent = closeBtn;
closeBtn.on(Node.EventType.TOUCH_START, (e: any) => { e.propagationStopped = true; this.close(); }, this);
// 分隔线
const dividerY = this.PANEL_H / 2 - headerH;
const divider = this.makeNode('Divider', this.PANEL_W - 40, 2, new Color(50, 100, 45, 180), 0, dividerY, 2);
divider.parent = panelNode;
// 标签按钮（仅商店模式）
if (this.isShop) {
const tabContainer = new Node('TabContainer');
tabContainer.layer = Layers.Enum.UI_2D;
tabContainer.setPosition(0, dividerY - 22, 5);
tabContainer.parent = panelNode;
const tabUt = tabContainer.addComponent(UITransform);
tabUt.setContentSize(this.PANEL_W - 20, 36);
this.tabContainer = tabContainer;
this.createTabButtons(tabContainer);
}
// ScrollView + Grid Layout
const gridTop = dividerY - (this.isShop ? 45 : 10);
const scrollAreaH = gridTop + this.PANEL_H / 2 - 55;
const scrollNode = new Node('ScrollView');
scrollNode.layer = Layers.Enum.UI_2D;
scrollNode.parent = panelNode;
const scrollUt = scrollNode.addComponent(UITransform);
scrollUt.setContentSize(this.PANEL_W - 40, scrollAreaH);
scrollNode.setPosition(0, (gridTop - scrollAreaH / 2), 2);
this.scrollView = scrollNode.addComponent(ScrollView);
this.scrollView.horizontal = false;
this.scrollView.vertical = true;
this.scrollView.inertia = true;
this.scrollView.elastic = true;
this.scrollView.brake = 0.75;
this.scrollView.bounceDuration = 0.3;
const viewNode = new Node('View');
viewNode.layer = Layers.Enum.UI_2D;
viewNode.parent = scrollNode;
const viewUt = viewNode.addComponent(UITransform);
viewUt.setContentSize(this.PANEL_W - 40, scrollAreaH);
const viewMask = viewNode.addComponent(Mask);
viewMask.type = Mask.Type.GRAPHICS_RECT;
const contentNode = new Node('Content');
contentNode.layer = Layers.Enum.UI_2D;
contentNode.parent = viewNode;
const contentUt = contentNode.addComponent(UITransform);
contentUt.setContentSize(this.PANEL_W - 40, scrollAreaH);
contentUt.setAnchorPoint(0.5, 1);
this.layout = contentNode.addComponent(Layout);
this.layout.type = Layout.Type.GRID;
this.layout.resizeMode = Layout.ResizeMode.CONTAINER;
this.layout.startAxis = Layout.AxisDirection.HORIZONTAL;
this.layout.cellSize = new Size(this.CELL_SIZE + 8, this.CELL_SIZE + 8);
this.layout.spacingX = this.CELL_GAP;
this.layout.spacingY = this.CELL_GAP;
this.layout.constraint = Layout.Constraint.FIXED_COL;
this.layout.constraintNum = this.COLS;
this.layout.paddingLeft = this.GRID_PADDING;
this.layout.paddingRight = this.GRID_PADDING;
this.layout.paddingTop = this.GRID_PADDING;
this.layout.paddingBottom = this.GRID_PADDING;
this.scrollView.content = contentNode;
(this.scrollView as any)._view = viewNode;
// 滚动条
const vBarNode = new Node('VScrollBar');
vBarNode.layer = Layers.Enum.UI_2D;
vBarNode.parent = scrollNode;
const vBarUt = vBarNode.addComponent(UITransform);
vBarUt.setContentSize(8, scrollAreaH - 12);
vBarNode.setPosition(this.PANEL_W / 2 - 30, 0, 3);
const barBg = this.makeNode('BarBg', 8, scrollAreaH - 12, this.C_SCROLL_BG, 0, 0, 0);
barBg.parent = vBarNode;
const barHandle = new Node('Handle');
barHandle.layer = Layers.Enum.UI_2D;
barHandle.parent = vBarNode;
const handleUt = barHandle.addComponent(UITransform);
handleUt.setContentSize(8, 60);
const handleG = barHandle.addComponent(Graphics);
handleG.clear();
handleG.fillColor = this.C_SCROLL_HANDLE;
handleG.rect(-4, -30, 8, 60);
handleG.fill();
this.scheduleOnce(() => {
if (this.scrollView && vBarNode) {
const contentH = this.scrollView.content?.getComponent(UITransform)?.height || 0;
const viewH = viewNode.getComponent(UITransform)?.height || 0;
vBarNode.active = contentH > viewH + 10;
}
}, 0.2);
this.gridNode = contentNode;
// 排序栏占位
this.sortBarNode = new Node('SortBarContainer');
this.sortBarNode.layer = Layers.Enum.UI_2D;
this.sortBarNode.parent = panelNode;
const sortBarContainerUt = this.sortBarNode.addComponent(UITransform);
sortBarContainerUt.setContentSize(this.PANEL_W - 40, 36);
this.sortBarNode.setPosition(0, gridTop + 2, 5);
this.sortBarNode.active = false;
// 底部提示
const infoNode = this.makeLabel('Info', '点击物品查看详情', 20, new Color(180, 180, 180, 255));
infoNode.setPosition(0, -this.PANEL_H / 2 + 25, 2);
infoNode.parent = panelNode;
this.infoLabel = infoNode.getComponent(Label);
// 入场动画
this.playPanelEntryAnimation(panelNode);
}
// ==================== 标签按钮 ====================
private createTabButtons(parent: Node) {
const tabs = [
{ key: 'unlocked', label: '已解锁' },
{ key: 'locked', label: '未解锁' },
{ key: 'all', label: '全 部' },
];
const tabW = 100;
const tabH = 34;
const gap = 8;
const SEL = this.makeSelDrawer(parent);
tabs.forEach((tab, i) => {
const x = (i - 1) * (tabW + gap);
const btn = this.makeNode(`Tab_${tab.key}`, tabW, tabH, 
tab.key === this.currentShopTab ? this.C_TAB_ACTIVE : this.C_TAB_INACTIVE, 
x, 0, 0, 6, this.C_BORDER, 2);
btn.parent = parent;
const lbl = this.makeLabel('L', tab.label, 18, Color.WHITE);
lbl.setPosition(0, 0, 3);
lbl.parent = btn;
btn.on(Node.EventType.TOUCH_START, (e: any) => {
e.propagationStopped = true;
this.currentShopTab = tab.key;
SEL(tab.key, tabW, tabH);
this.refreshShopContent();
}, this);
});
}
private makeSelDrawer(parent: Node, prefix: string = 'Tab') {
return (activeAction: string, w: number, h: number) => {
parent.children.forEach(child => {
const mainNode = child.getChildByName(`${child.name}_Main`);
const g = mainNode?.getComponent(Graphics);
if (!g) return;
const isSel = child.name === `${prefix}_${activeAction}`;
const color = isSel ? this.C_TAB_ACTIVE : this.C_TAB_INACTIVE;
g.clear();
g.fillColor = color;
g.rect(-w / 2, -h / 2, w, h);
g.fill();
});
};
}
// ==================== 商店内容 ====================
private _retryRefreshShop(attempt: number) {
const shopManager = ShopManager.getInstance();
if (shopManager?.isDataReady()) {
this.refreshShopContent();
return;
}
if (attempt < 10) {
this.showInfo(`商店数据加载中... (${attempt}/10)`);
this.scheduleOnce(() => this._retryRefreshShop(attempt + 1), 0.5);
} else {
this.showInfo('商店数据加载失败，请重试');
}
}
private refreshShopContent() {
if (!this.gridNode) return;
this.gridNode.removeAllChildren();
if (this.tabContainer) this.tabContainer.active = true;
if (this.sortBarNode) this.sortBarNode.active = false;
if (this.titleLabel) this.titleLabel.string = '商店';
this.updateGoldDisplay();
const shopManager = ShopManager.getInstance();
if (!shopManager) {
this.showInfo('商店数据加载中...');
return;
}
// 数据异步加载检查：ShopManager 通过 resources.load 异步加载，首次打开可能尚未就绪
if (!shopManager.isDataReady()) {
this.showInfo('商店数据加载中...');
this.scheduleOnce(() => this._retryRefreshShop(1), 0.3);
return;
}
const allItems = shopManager.getAllItems();
if (!allItems || allItems.length === 0) {
this.showInfo('商店暂无物品');
return;
}
const playerLevel = CurrencySystem.getInstance()?.level || 1;
const gold = CurrencySystem.getInstance()?.gold || 0;
const filtered = allItems.filter(item => {
if (this.currentShopTab === 'unlocked') return item.unlocked;
if (this.currentShopTab === 'locked') return !item.unlocked;
return true; // all
});
if (filtered.length === 0) {
this.showInfo(this.currentShopTab === 'locked' ? '所有作物已解锁！' : '暂无物品');
return;
}
filtered.forEach((item, index) => {
this.createShopCell(item, index, playerLevel, gold);
});
this.layout?.updateLayout();
}
private createShopCell(item: ShopItem, index: number, _playerLevel: number, gold: number) {
const cellW = this.CELL_SIZE;
const cellH = this.CELL_SIZE;
const isLocked = !item.unlocked;
const cropId = item.cropId;
const canAfford = !isLocked && gold >= (item.seedPrice || 0);
const bgColor = isLocked ? this.C_CELL_SLOT : this.C_LEATHER_MID;
const cell = this.makeNode('Cell', cellW, cellH, bgColor, 0, 0, 0, 6, this.C_BORDER, 2);
cell.parent = this.gridNode;
// 图标
const icon = this.CROP_ICONS[cropId] || '📦';
const iconLabel = this.makeLabel('Icon', icon, 40, isLocked ? new Color(80, 80, 80, 180) : Color.WHITE);
iconLabel.setPosition(0, 10, 2);
iconLabel.parent = cell;
// 名称 + 价格
const nameColor = isLocked ? new Color(100, 100, 100, 255) : new Color(220, 210, 180, 255);
const nameLabel = isLocked ? '???' : (this.CROP_NAMES[cropId] || item.cropName || `作物${cropId}`);
const priceColor = canAfford ? new Color(255, 200, 50, 255) : new Color(255, 70, 70, 255);
const priceLabel = isLocked ? `Lv.${item.unlockLevel}` : `💰${item.seedPrice}`;
const infoText = isLocked ? `???  ${priceLabel}` : `${nameLabel}  ${priceLabel}`;
const info = this.makeLabel('Info', infoText, 13, nameColor);
info.setPosition(0, -33, 3);
info.parent = cell;
// 底部作物色条
if (!isLocked && this.CROP_COLORS[cropId]) {
const bar = this.makeNode('ColorBar', cellW - 10, 3, this.CROP_COLORS[cropId], 0, -cellH / 2 + 4, 4);
bar.parent = cell;
}
// 触摸反馈
cell.on(Node.EventType.TOUCH_START, (e: any) => {
e.propagationStopped = true;
tween(cell).to(0.06, { scale: new Vec3(0.92, 0.92, 1) }).start();
if (isLocked) {
this.showInfo(`需要等级 ${item.unlockLevel || '?'} 解锁`);
this.scheduleOnce(() => {
if (cell.isValid) tween(cell).to(0.12, { scale: new Vec3(1, 1, 1) }).start();
}, 0.15);
return;
}
this.highlightCell(cell);
this.showDetailPopup(item, 'shop');
}, this);
cell.on(Node.EventType.TOUCH_END, () => {
this.scheduleOnce(() => {
if (cell.isValid) tween(cell).to(0.1, { scale: Vec3.ONE }).start();
}, 0.05);
}, this);
cell.on(Node.EventType.TOUCH_CANCEL, () => {
if (cell.isValid) tween(cell).to(0.1, { scale: Vec3.ONE }).start();
}, this);
}
// ==================== 排序按钮 ====================

    private createSortButtons(parent: Node) {
        if (parent.children.length > 0) return;
        const tabs = [
            { key: 'all', label: '全 部' },
            { key: 'count', label: '按数量' },
            { key: 'price', label: '按价格' },
        ];
        const tabW = 90;
        const tabH = 32;
        const gap = 8;
        const SEL = this.makeSelDrawer(parent, 'Sort');
        tabs.forEach((tab, i) => {
            const x = (i - 1) * (tabW + gap);
            const btn = this.makeNode(`Sort_${tab.key}`, tabW, tabH,
                tab.key === this.currentWarehouseSort ? this.C_TAB_ACTIVE : this.C_TAB_INACTIVE,
                x, 0, 0, 6, this.C_BORDER, 2);
            btn.parent = parent;
            const lbl = this.makeLabel('L', tab.label, 16, Color.WHITE);
            lbl.setPosition(0, 0, 3);
            lbl.parent = btn;
            btn.on(Node.EventType.TOUCH_START, (e: any) => {
                e.propagationStopped = true;
                this.currentWarehouseSort = tab.key;
                SEL(tab.key, tabW, tabH);
                this.refreshWarehouseContent();
            }, this);
        });
    }

// ==================== 仓库内容 ====================
private refreshWarehouseContent() {
if (!this.gridNode) return;
this.gridNode.removeAllChildren();
if (this.tabContainer) this.tabContainer.active = false;
if (this.sortBarNode) { this.sortBarNode.active = true; this.createSortButtons(this.sortBarNode); }
if (this.titleLabel) this.titleLabel.string = '仓库';
this.updateGoldDisplay();
const warehouse = WarehouseManager.getInstance();
if (!warehouse) {
this.showInfo('仓库数据加载中...');
return;
}
const items = warehouse.getAllItems();
if (!items || items.length === 0) {
this.showInfo('仓库是空的，去收获作物吧！');
return;
}
if (this.currentWarehouseSort === 'count') {
items.sort((a, b) => b.count - a.count);
} else if (this.currentWarehouseSort === 'price') {
items.sort((a, b) => b.sellPrice - a.sellPrice);
}
items.forEach((item, index) => {
this.createWarehouseCell(item, index);
});
this.layout?.updateLayout();
}
private createWarehouseCell(item: WarehouseItem, index: number) {
const cellW = this.CELL_SIZE;
const cellH = this.CELL_SIZE;
const cropId = item.cropId;
const cell = this.makeNode('Cell', cellW, cellH, this.C_CELL_SLOT, 0, 0, 0, 6, this.C_BORDER, 2);
cell.parent = this.gridNode;
// 图标
const icon = this.CROP_ICONS[cropId] || '📦';
const iconLabel = this.makeLabel('Icon', icon, 40, Color.WHITE);
iconLabel.setPosition(0, 10, 2);
iconLabel.parent = cell;
// 名称 + 数量 + 售价
const cropName = this.CROP_NAMES[cropId] || item.cropName || `物品${cropId}`;
const sellPriceVal = item.sellPrice || '?';
const infoText = `${cropName}  ×${item.count}  💰${sellPriceVal}`;
const info = this.makeLabel('Info', infoText, 13, new Color(220, 230, 200, 255));
info.setPosition(0, -33, 3);
info.parent = cell;
// 底部色条
if (this.CROP_COLORS[cropId]) {
const bar = this.makeNode('ColorBar', cellW - 10, 3, this.CROP_COLORS[cropId], 0, -cellH / 2 + 4, 4);
bar.parent = cell;
}
// 触摸反馈
cell.on(Node.EventType.TOUCH_START, (e: any) => {
e.propagationStopped = true;
tween(cell).to(0.06, { scale: new Vec3(0.92, 0.92, 1) }).start();
this.highlightCell(cell);
this.showDetailPopup(item, 'warehouse');
}, this);
cell.on(Node.EventType.TOUCH_END, () => {
this.scheduleOnce(() => {
if (cell.isValid) tween(cell).to(0.1, { scale: Vec3.ONE }).start();
}, 0.05);
}, this);
cell.on(Node.EventType.TOUCH_CANCEL, () => {
if (cell.isValid) tween(cell).to(0.1, { scale: Vec3.ONE }).start();
}, this);
}
// ==================== 存档内容 ====================
private refreshSavePanelContent() {
if (!this.gridNode) return;
this.gridNode.removeAllChildren();
if (this.tabContainer) this.tabContainer.active = false;
if (this.sortBarNode) this.sortBarNode.active = false;
if (this.titleLabel) this.titleLabel.string = '存档';
const saveManager = SaveManager.getInstance();
if (!saveManager) {
this.showInfo('存档系统未初始化');
return;
}
const slotCount = 3;
const slotW = this.PANEL_W - 60;
const slotH = 70;
for (let slot = 0; slot < slotCount; slot++) {
const yOffset = -slot * (slotH + 10);
const slotNode = this.makeNode(`Slot_${slot}`, slotW, slotH, this.C_LEATHER_MID, 0, yOffset, 0, 6, this.C_BORDER, 1);
slotNode.parent = this.gridNode;
const saveData = saveManager.getSlotInfo(slot);
const hasData = saveData && saveData.timestamp > 0;
// 槽位号
const slotNum = this.makeLabel('Num', `存档 ${slot + 1}`, 24, hasData ? new Color(255, 220, 100, 255) : new Color(150, 150, 150, 255));
slotNum.setPosition(-slotW / 2 + 80, 0, 2);
slotNum.parent = slotNode;
// 存档信息
const infoText = hasData
? `💰${saveData.gold}  📅${new Date(saveData.timestamp).toLocaleString()}`
: '空槽位';
const infoLabel = this.makeLabel('Info', infoText, 16, hasData ? new Color(200, 200, 180, 255) : new Color(120, 120, 120, 255));
infoLabel.setPosition(30, -12, 2);
infoLabel.parent = slotNode;
// 保存按钮
const saveBtn = this.makeNode('SaveBtn', 80, 40, new Color(50, 130, 50, 255), slotW / 2 - 60, 0, 4, 8);
saveBtn.parent = slotNode;
const saveLbl = this.makeLabel('L', '保存', 18, Color.WHITE);
saveLbl.setPosition(0, 0, 5);
saveLbl.parent = saveBtn;
saveBtn.on(Node.EventType.TOUCH_START, async (e: any) => {
e.propagationStopped = true;
const ok = await saveManager.save(slot);
this.showInfo(`保存到槽位 ${slot + 1}: ${ok ? '成功' : '失败'}`);
}, this);
// 读取按钮
if (hasData) {
const loadBtn = this.makeNode('LoadBtn', 80, 40, new Color(50, 120, 180, 255), slotW / 2 - 155, 0, 4, 8);
loadBtn.parent = slotNode;
const loadLbl = this.makeLabel('L', '读取', 18, Color.WHITE);
loadLbl.setPosition(0, 0, 5);
loadLbl.parent = loadBtn;
loadBtn.on(Node.EventType.TOUCH_START, async (e: any) => {
e.propagationStopped = true;
const ok = await saveManager.load(slot);
this.showInfo(`读取槽位 ${slot + 1}: ${ok ? '成功' : '失败'}`);
if (ok) this.scheduleOnce(() => this.close(), 0.3);
}, this);
// 删除按钮
const delBtn = this.makeNode('DelBtn', 70, 40, new Color(160, 50, 50, 255), slotW / 2 - 250, 0, 4, 8);
delBtn.parent = slotNode;
const delLbl = this.makeLabel('L', '删除', 18, Color.WHITE);
delLbl.setPosition(0, 0, 5);
delLbl.parent = delBtn;
delBtn.on(Node.EventType.TOUCH_START, (e: any) => {
e.propagationStopped = true;
saveManager.deleteSave(slot);
this.showInfo(`已删除槽位 ${slot + 1}`);
this.scheduleOnce(() => this.refreshSavePanelContent(), 0.3);
}, this);
}
}
}
// ==================== 选中高亮 ====================
private highlightCell(cell: Node) {
this.clearHighlight();
this.selectedCell = cell;
}
private clearHighlight() {
if (this.selectedHighlight) {
this.selectedHighlight.destroy();
this.selectedHighlight = null;
}
this.selectedCell = null;
}
// ==================== 详情弹窗 ====================
private showDetailPopup(item: any, mode: 'shop' | 'warehouse') {
this.closeDetailPopup();
const cropId = item.cropId || 0;
const icon = this.CROP_ICONS[cropId] || '📦';
const color = this.CROP_COLORS[cropId] || new Color(100, 100, 100, 255);
const price = mode === 'shop' ? (item.seedPrice || 0) : (item.sellPrice || 0);
if (mode === 'shop') {
const gold = CurrencySystem.getInstance()?.gold || 0;
this.detailMaxQuantity = Math.floor(gold / Math.max(1, price));
if (this.detailMaxQuantity <= 0) this.detailMaxQuantity = 0;
} else {
this.detailMaxQuantity = item.count || 0;
}
this.detailQuantity = Math.min(1, this.detailMaxQuantity);
// 弹窗背景
const popup = this.makeNode('DetailPopup', 2000, 2000, new Color(0, 0, 0, 140), 0, 0, 20);
popup.parent = this.node;
const popMaskOpacity = popup.addComponent(UIOpacity);
popMaskOpacity.opacity = 0;
tween(popMaskOpacity).to(0.2, { opacity: 255 }).start();
popup.on(Node.EventType.TOUCH_START, (e: any) => { e.propagationStopped = true; }, this);
popup.on(Node.EventType.TOUCH_END, (e: any) => { e.propagationStopped = true; this.closeDetailPopup(); }, this);
const popW = 420;
const popH = 380;
// 弹窗主体
const popBody = this.makeNode('PopBody', popW, popH, new Color(20, 50, 28, 252), 0, 0, 21, 14);
popBody.parent = popup;
popBody.on(Node.EventType.TOUCH_START, (e: any) => { e.propagationStopped = true; }, this);
// 拦截 TOUCH_END 防止冒泡到 popup mask 导致弹窗关闭
popBody.on(Node.EventType.TOUCH_END, (e: any) => { e.propagationStopped = true; }, this);
// 作物颜色条
const topBar = this.makeNode('TopBar', popW - 20, 5, color, 0, popH / 2 - 12, 22);
topBar.parent = popBody;
// 图标
const iconNode = this.makeLabel('Icon', icon, 44, Color.WHITE);
iconNode.setPosition(0, popH / 2 - 55, 22);
iconNode.parent = popBody;
// 名称
const nameStr = mode === 'shop' ? (this.CROP_NAMES[cropId] || item.cropName || `作物${cropId}`) : (this.CROP_NAMES[cropId] || item.cropName || `作物${cropId}`);
const nameNode = this.makeLabel('Name', nameStr, 26, new Color(255, 220, 100, 255));
nameNode.setPosition(0, popH / 2 - 90, 22);
nameNode.parent = popBody;
// 价格信息
const priceText = mode === 'shop' ? `单价: 💰${price}` : `售价: 💰${price}`;
const priceInfo = this.makeLabel('Price', priceText, 20, new Color(255, 230, 180, 255));
priceInfo.setPosition(0, popH / 2 - 120, 22);
priceInfo.parent = popBody;
// 数量选择器
const qtyY = popH / 2 - 185;
const minusBtn = this.makeNode('Minus', 48, 48, new Color(160, 70, 50, 255), -60, qtyY, 22, 10);
minusBtn.parent = popBody;
const minusLbl = this.makeLabel('L', ' − ', 28, Color.WHITE);
minusLbl.setPosition(0, 0, 23);
minusLbl.parent = minusBtn;
minusBtn.on(Node.EventType.TOUCH_START, (e: any) => { e.propagationStopped = true; this.changeDetailQty(-1); }, this);
const qtyLabel = this.makeLabel('Qty', `${this.detailQuantity}`, 32, Color.WHITE);
qtyLabel.setPosition(0, qtyY, 22);
qtyLabel.parent = popBody;
this.detailQtyLabel = qtyLabel.getComponent(Label);
const maxLabel = this.makeLabel('Max', `/${this.detailMaxQuantity}`, 18, new Color(180, 180, 180, 255));
maxLabel.setPosition(35, qtyY, 22);
maxLabel.parent = popBody;
const plusBtn = this.makeNode('Plus', 48, 48, new Color(50, 140, 50, 255), 60, qtyY, 22, 10);
plusBtn.parent = popBody;
const plusLbl = this.makeLabel('L', ' + ', 28, Color.WHITE);
plusLbl.setPosition(0, 0, 23);
plusLbl.parent = plusBtn;
plusBtn.on(Node.EventType.TOUCH_START, (e: any) => { e.propagationStopped = true; this.changeDetailQty(1); }, this);
// 总计
const totalY = qtyY - 45;
const totalText = `合计: ${this.detailQuantity * price} 💰`;
const totalNode = this.makeLabel('Total', totalText, 22, new Color(255, 230, 100, 255));
totalNode.setPosition(0, totalY, 22);
totalNode.parent = popBody;
this.detailTotalLabel = totalNode.getComponent(Label);
// 操作按钮
const btnY = totalY - 55;
if (mode === 'shop') {
const canAfford = this.detailMaxQuantity > 0;
const btnColor = canAfford ? new Color(50, 140, 50, 255) : new Color(80, 80, 80, 255);
const btnText = canAfford ? '购 买' : '金币不足';
const confirmBtn = this.makeNode('Confirm', 140, 48, btnColor, -80, btnY, 22, 10);
confirmBtn.parent = popBody;
const confirmLbl = this.makeLabel('L', btnText, 22, Color.WHITE);
confirmLbl.setPosition(0, 0, 23);
confirmLbl.parent = confirmBtn;
if (canAfford) {
confirmBtn.on(Node.EventType.TOUCH_START, (e: any) => {
e.propagationStopped = true;
this.confirmBuy(item);
}, this);
}
} else {
const confirmBtn = this.makeNode('Confirm', 140, 48, new Color(50, 120, 200, 255), -80, btnY, 22, 10);
confirmBtn.parent = popBody;
const confirmLbl = this.makeLabel('L', '出 售', 22, Color.WHITE);
confirmLbl.setPosition(0, 0, 23);
confirmLbl.parent = confirmBtn;
confirmBtn.on(Node.EventType.TOUCH_START, (e: any) => {
e.propagationStopped = true;
this.confirmSell(item);
}, this);
}
const cancelBtn = this.makeNode('Cancel', 140, 48, new Color(160, 90, 50, 255), 80, btnY, 22, 10);
cancelBtn.parent = popBody;
const cancelLbl = this.makeLabel('L', '取 消', 22, Color.WHITE);
cancelLbl.setPosition(0, 0, 23);
cancelLbl.parent = cancelBtn;
cancelBtn.on(Node.EventType.TOUCH_START, (e: any) => { e.propagationStopped = true; this.closeDetailPopup(); }, this);
// 关闭按钮
const closeX = this.makeNode('CloseX', 36, 36, new Color(180, 50, 50, 255), popW / 2 - 25, popH / 2 - 25, 22);
closeX.parent = popBody;
const closeXLbl = this.makeLabel('L', '✕', 22, Color.WHITE);
closeXLbl.setPosition(0, 0, 23);
closeXLbl.parent = closeX;
closeX.on(Node.EventType.TOUCH_START, (e: any) => { e.propagationStopped = true; this.closeDetailPopup(); }, this);
this.detailPopup = popup;
}
private changeDetailQty(delta: number) {
const newQty = this.detailQuantity + delta;
if (newQty < 1 || newQty > this.detailMaxQuantity) return;
this.detailQuantity = newQty;
if (this.detailQtyLabel) {
this.detailQtyLabel.string = `${this.detailQuantity}`;
}
this.updateDetailTotal();
}
private updateDetailTotal() {
if (!this.detailTotalLabel || !this.detailPopup) return;
const popBody = this.detailPopup.getChildByName('PopBody');
if (!popBody) return;
// Find the price from the popup content
const priceLabel = popBody.getChildByName('Price');
const priceText = priceLabel?.getComponent(Label)?.string || '';
const priceMatch = priceText.match(/\d+/);
const price = priceMatch ? parseInt(priceMatch[0]) : 0;
this.detailTotalLabel.string = `合计: ${this.detailQuantity * price} 💰`;
}
private confirmBuy(item: any) {
const shopManager = ShopManager.getInstance();
const gold = CurrencySystem.getInstance();
if (!shopManager || !gold) return;
const totalCost = this.detailQuantity * (item.seedPrice || 0);
if (gold.gold < totalCost) {
this.showInfo('金币不足！');
return;
}
const result = shopManager.buySeed(item.cropId, this.detailQuantity);
if (result && result.success) {
this.showInfo(`成功购买 ${this.detailQuantity} 个${item.cropName || '物品'}！`);
this.closeDetailPopup();
this.scheduleOnce(() => this.refreshShopContent(), 0.2);
this.updateGoldDisplay();
} else {
this.showInfo(result?.message || '购买失败');
}
}
    private confirmSell(item: any) {
        const warehouse = WarehouseManager.getInstance();
        const gold = CurrencySystem.getInstance();
        if (!warehouse || !gold) return;
        const result = warehouse.sellCrop(item.cropId, this.detailQuantity);
        if (result > 0) {
            gold.addGold(result);
            this.showInfo(`出售成功，获得 💰${result}！`);
            this.closeDetailPopup();
            this.scheduleOnce(() => this.refreshWarehouseContent(), 0.3);
            this.updateGoldDisplay();
        } else {
            this.showInfo('出售失败');
        }
    }
private closeDetailPopup() {
if (this.detailPopup) {
this.detailPopup.destroy();
this.detailPopup = null;
}
this.detailQtyLabel = null;
this.detailTotalLabel = null;
this.clearHighlight();
}
// ==================== 事件和显示 ====================
private onCurrencyChanged() {
this.updateGoldDisplay();
if (this.isShop) {
this.scheduleOnce(() => this.refreshShopContent(), 0.2);
}
}
private onCropHarvested() {
if (!this.isShop && !this.isSavePanel) {
this.scheduleOnce(() => this.refreshWarehouseContent(), 0.3);
}
}
private updateGoldDisplay() {
if (this.goldLabel) {
const gold = CurrencySystem.getInstance()?.gold || 0;
this.goldLabel.string = `💰 ${gold}`;
}
}
private showInfo(text: string) {
if (this.infoLabel) {
this.infoLabel.string = text;
}
}
// ==================== 关闭 ====================
close() {
this.closeDetailPopup();
if (this.isEventsRegistered) {
eventBus.off(GameEvent.GOLD_CHANGED, this.onCurrencyChanged, this);
eventBus.off(GameEvent.CROP_HARVESTED, this.onCropHarvested, this);
this.isEventsRegistered = false;
}
const panelType = this.isSavePanel ? 'save' : (this.isShop ? 'shop' : 'warehouse');
eventBus.emit(GameEvent.UI_CLOSE, { panel: panelType });
}
// ==================== 入场动画 ====================
private playPanelEntryAnimation(panel: Node) {
if (!panel) return;
panel.setScale(new Vec3(0.85, 0.85, 1));
const opacity = panel.addComponent(UIOpacity);
opacity.opacity = 0;
tween(panel)
.to(0.25, { scale: Vec3.ONE })
.start();
tween(opacity)
.to(0.25, { opacity: 255 })
.start();
}
// ==================== 工具方法 ====================
/** 创建纯色节点（Graphics纯色矩形填充）
*  边框通过叠加两个不同大小矩形的纯色Graphics子节点实现
*/
private makeNode(name: string, w: number, h: number, color: Color | null, x: number, y: number, z: number,
_radius: number = 8, border: Color | null = null, borderWidth: number = 2): Node {
const node = new Node(name);
node.layer = Layers.Enum.UI_2D;
const ut = node.addComponent(UITransform);
ut.setContentSize(w, h);
if (border) {
const fillBorder = new Node(name + '_Border');
fillBorder.layer = Layers.Enum.UI_2D;
fillBorder.parent = node;
fillBorder.setSiblingIndex(0);
const fbu = fillBorder.addComponent(UITransform);
fbu.setContentSize(w + borderWidth * 2, h + borderWidth * 2);
const fbg = fillBorder.addComponent(Graphics);
fbg.clear();
fbg.fillColor = border;
fbg.rect(-(w + borderWidth * 2) / 2, -(h + borderWidth * 2) / 2, w + borderWidth * 2, h + borderWidth * 2);
fbg.fill();
}
if (color) {
const fillMain = new Node(name + '_Main');
fillMain.layer = Layers.Enum.UI_2D;
fillMain.parent = node;
fillMain.setSiblingIndex(border ? 1 : 0);
const fmu = fillMain.addComponent(UITransform);
fmu.setContentSize(w, h);
const fmg = fillMain.addComponent(Graphics);
fmg.clear();
fmg.fillColor = color;
fmg.rect(-w / 2, -h / 2, w, h);
fmg.fill();
}
node.setPosition(x, y, z);
return node;
}
/** 创建带Label的节点 */
private makeLabel(name: string, text: string, fontSize: number, color: Color): Node {
const node = new Node(name);
node.layer = Layers.Enum.UI_2D;
const ut = node.addComponent(UITransform);
ut.setContentSize(this.CELL_SIZE || 200, fontSize + 10);
const lbl = node.addComponent(Label);
lbl.string = text;
lbl.fontSize = fontSize;
lbl.color = color;
lbl.horizontalAlign = Label.HorizontalAlign.CENTER;
return node;
}
/** 创建宽文本Label（自动换行） */
private makeWideLabel(name: string, text: string, fontSize: number, color: Color, width: number): Node {
const node = new Node(name);
node.layer = Layers.Enum.UI_2D;
const ut = node.addComponent(UITransform);
ut.setContentSize(width, fontSize * 3);
const lbl = node.addComponent(Label);
lbl.string = text;
lbl.fontSize = fontSize;
lbl.color = color;
lbl.horizontalAlign = Label.HorizontalAlign.CENTER;
lbl.overflow = Overflow.RESIZE_HEIGHT;
return node;
}
}
