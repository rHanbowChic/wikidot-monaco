# Wikidot Monaco

Chrome / Firefox 扩展：把 wikidot（`*.wikidot.com`）的源码编辑框替换为 [Monaco](https://microsoft.github.io/monaco-editor/) 编辑器，并提供 wikidot 语法高亮与自动补全。

被替换的文本框：

- `textarea#edit-page-textarea`（页面编辑）
- `#new-post-form textarea#np-text`（论坛发帖）

`div.page-source`（「源代码」及历史版本的源码）会显示为只读 Monaco 编辑器，原 div 隐藏保留。

原 `<textarea>` 保留在页面中（隐藏），其 `value`、`selectionStart`/`selectionEnd`、`setSelectionRange()`、`setRangeText()`、`scrollTop`、`focus()` 等直接读写 Monaco；键盘、`input`、`focus`/`blur`/`change` 事件会在原文本框上照常触发，`document.execCommand('insertText')` 也会写入编辑器。因此 wikidot 自带的编辑工具栏与假定它是 textarea 的社区插件可以继续工作。

Monaco 完整打包在扩展内，不依赖任何 CDN；编辑器只在页面上出现目标文本框时才加载。

保存超时：wikidot 的 `init.combined.js` 通过 `YAHOO.util.Connect.asyncRequest` 发送保存、发帖等请求时不设超时，网络不佳时会一直显示「Saving page...」。扩展在运行时包装这个函数（不替换 wikidot 的脚本文件），给带 `action` 的 `/ajax-module-connector.php` 请求加上 YUI 自带的 `timeout`（默认 30 秒，可在设置页修改，0 为不限）。超时后的处理与请求失败相同：弹出提示，收起等待框与遮罩，可以再次点击保存。

## 开发

```shell
npm install
npm run dev     # 监听并构建到 build/
npm run build   # 类型检查 + 构建
npm run zip     # 构建并打包到 package/
```

在 `chrome://extensions` 开启开发者模式，选择「加载已解压的扩展程序」并指向 `build/`。需要 Chrome 111+。

### Firefox

```shell
npm run dev:firefox    # 监听并构建到 build-firefox/
npm run build:firefox  # 类型检查 + 构建
npm run run:firefox    # 用临时配置启动 Firefox 并加载 build-firefox/，修改后自动重载
npm run lint:firefox   # 构建并用 web-ext 按 AMO 规则检查
npm run zip:firefox    # 构建并打包到 package/（未签名）
npm run sign:firefox   # 构建、打包源码，并交给 AMO 签名，签好的 .xpi 保存到 package/
```

需要 Firefox 128+（页面环境内容脚本）。源码与 Chrome 版相同，只有 manifest 在构建时转换（见 `scripts/build.mjs` 的 `toFirefox`）：`background.service_worker` 换成 `background.scripts`，并加上 `browser_specific_settings.gecko`（扩展 ID `wikidot-monaco-editor@ect.fyi`，上架后不可更改）。

也可以在 `about:debugging#/runtime/this-firefox` 选择「临时载入附加组件」并指向 `build-firefox/manifest.json`。

#### 签名

Firefox 正式版只能安装由 Mozilla 签名的扩展。`sign:firefox` 以 unlisted 渠道提交（不在 AMO 商店上架，签名后自行分发），并附上 `scripts/source.mjs` 生成的源码包，源码包的构建步骤为 `npm ci && npm run build:firefox`。

1. 在 <https://addons.mozilla.org/developers/addon/api/key/> 生成 API 密钥。
2. 通过环境变量提供密钥（不要写进项目）后运行：

   ```shell
   WEB_EXT_API_KEY=user:… WEB_EXT_API_SECRET=… npm run sign:firefox
   ```

每个版本号只能签名一次，再次签名前先修改 `package.json` 的 `version`。

## 结构

- `src/content/bridge.ts`：隔离环境内容脚本，读取设置并传给页面环境
- `src/content/main.ts`：页面环境（MAIN world）内容脚本，监视目标文本框并按需加载编辑器
- `src/content/timeout.ts`：给 wikidot 的 ajax 保存请求加超时
- `src/editor/`：Monaco 精简构建、textarea 兼容层（`textarea.ts`）与 wikidot 语言支持（`wikidot/`）
- `src/options/`：设置页（文字在 `messages.ts`）
- `src/i18n.ts`：界面语言。浏览器界面为简体或繁体中文时显示中文，其他语言一律显示英文；判断依据是浏览器从 `public/_locales/` 选中的 `locale` 条目，manifest 描述也来自这里

语法资料来源：<https://merula.ect.fyi/doc-wiki-syntax/>、<https://merula.ect.fyi/doc/quick-reference.html>
