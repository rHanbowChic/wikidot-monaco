# CHANGELOG

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
