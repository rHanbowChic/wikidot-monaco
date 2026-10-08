# CHANGELOG

## 0.0.5

- feat: 悬停提示：Wikidot 标签、模块、属性和 ListPages 变量显示说明；`[[module CSS]]` 与 `[[html]]` 块内显示 CSS/HTML 说明
- feat: 页面链接：按住 Ctrl 点击 `[[include 页面]]`、`[[include :站点:页面]]` 和 `[[[页面|文字]]]` 中的页面名，在新标签页打开该页面
- fix: `[[module css]]` 等大小写不同的写法也有 CSS 高亮

## 0.0.4

- feat: 版本比较：页面历史中的「源代码变更」改用带语法高亮的左右对比显示，未改动的部分自动折叠；可在设置中改为内联（适合手机）
- feat: 行高设置（默认 1.5 倍字号，比原来稍高）；编辑器上下各留出约半行的边距
- chore: 更换 Firefox 扩展 ID 为 `wikidot-monaco-editor@ect.fyi`

## 0.0.3

- feat: 保存超时：网络不佳时保存页面、发帖不再一直卡在「Saving page...」，超时（默认 30 秒，可设置）后提示并收起等待框，可重新保存
- chore: 精简设置页文字：去掉重复的分类前缀和只复述标题的说明，不再出现 Monaco 等开发用语；「启用」移到「编辑器」下，表明它只管编辑器；字号、超时超出范围时取最近的有效值

## 0.0.2

- feat: 英文界面：设置页、补全说明与扩展描述随浏览器界面语言显示中文或英文，其他语言显示英文

## 0.0.1

- feat: Firefox 支持（`npm run build:firefox`，`npm run sign:firefox` 签名）
- feat: 新图标（黑色圆角矩形上的 📕）

## 0.0.0

- feat: 用 Monaco 替换 wikidot 页面编辑与论坛发帖文本框，保持 textarea API
- feat: wikidot 语法高亮、标签/属性/模块/ListPages 变量补全、块标签折叠
- feat: 设置页（补全方式、闭合标签、主题、字号、换行、缩略图）
