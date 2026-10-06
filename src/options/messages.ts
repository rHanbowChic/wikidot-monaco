import { t } from '../i18n'

/** Strings of options.html, keyed by the elements' `data-i18n` attribute. `code` spans in backticks. */
export const MESSAGES = {
  title: t('Wikidot Monaco Settings', 'Wikidot Monaco 设置'),
  editor: t('Editor', '编辑器'),
  enabled: t('Enable', '启用'),
  enabledHint: t(
    'Use an editor with syntax highlighting instead of the plain text box when editing pages, posting, and viewing source.',
    '编辑页面、发帖和查看源代码时，使用带语法高亮的编辑器代替原本的文本框。',
  ),
  theme: t('Theme', '主题'),
  themeAuto: t('Follow system', '跟随系统'),
  themeLight: t('Light', '浅色'),
  themeDark: t('Dark', '深色'),
  fontSize: t('Font size', '字号'),
  wordWrap: t('Word wrap', '自动换行'),
  wordWrapHint: t(
    'Show long lines on several lines. The source text is not changed.',
    '长行折到下一行显示，不会改动源码。',
  ),
  minimap: t('Minimap', '缩略图'),
  minimapHint: t(
    'Show an overview of the whole text on the right side of the editor.',
    '在编辑器右侧显示全文缩略图。',
  ),
  completion: t('Autocomplete', '自动补全'),
  trigger: t('Show suggestions', '显示补全'),
  triggerAuto: t('While typing', '输入时'),
  triggerManual: t('Only on Ctrl+Space', '仅按 Ctrl+Space 时'),
  triggerOff: t('Never', '从不'),
  closeTags: t('Close tags', '自动闭合标签'),
  closeTagsHint: t(
    'Add `[[/div]]` when completing `[[div]]`.',
    '补全 `[[div]]` 时自动加上 `[[/div]]`。',
  ),
  saving: t('Saving', '保存'),
  saveTimeout: t('Timeout (seconds)', '超时（秒）'),
  saveTimeoutHint: t(
    'If saving a page or a post gets no response in this time, show an error so you can save again. 0 waits forever.',
    '保存页面或发帖超过这个时间没有响应时，提示失败，可以重新保存。0 表示一直等待。',
  ),
  reset: t('Restore defaults', '恢复默认设置'),
  saved: t('Saved', '已保存'),
}

export type MessageKey = keyof typeof MESSAGES
