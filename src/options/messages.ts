import { t } from '../i18n'

/**
 * Strings of options.html, keyed by the elements' `data-i18n` attribute. `code` spans in
 * backticks, bold text in `**`.
 */
export const MESSAGES = {
  title: t('Wikidot Monaco Settings', 'Wikidot Monaco 设置'),
  categories: t('Categories', '分类'),
  general: t('General', '常规'),
  appearance: t('Appearance', '外观'),
  history: t('Page history', '页面历史'),
  about: t('About', '关于'),
  aboutVersion: t('Version', '版本'),
  aboutMonaco: t('Monaco Editor', 'Monaco 编辑器'),
  aboutLicense: t('License', '许可证'),
  aboutGitHub: t('Project on GitHub', 'GitHub 项目'),
  aboutChangelog: t('Changelog', '更新日志'),
  aboutIssues: t('Report a problem', '反馈问题'),
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
  lineHeight: t('Line height', '行高'),
  lineHeightHint: t('A multiple of the font size.', '字号的倍数。'),
  wordWrap: t('Word wrap', '自动换行'),
  wordWrapHint: t(
    'Show long lines on several lines. The source text is not changed.',
    '长行折到下一行显示，不会改动源码。',
  ),
  lineNumbers: t('Line numbers', '行号'),
  lineNumbersHint: t('Show line numbers on the left side of the editor.', '在编辑器左侧显示行号。'),
  minimap: t('Minimap', '缩略图'),
  minimapHint: t(
    'Show an overview of the whole text on the right side of the editor.',
    '在编辑器右侧显示全文缩略图。',
  ),
  diffView: t('Revision changes', '源代码变更'),
  diffViewHint: t(
    'How changes are shown when comparing revisions in the page history.',
    '在页面历史中比较版本时，改动的显示方式。',
  ),
  diffSideBySide: t('Side by side', '左右对比'),
  diffInline: t('Inline', '内联'),
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
  tagEnter: t('Enter in tags', '标签内回车'),
  tagEnterHint: t(
    'Enter after `[[div]]` adds `[[/div]]` and indents the line between; Enter in an unfinished tag finishes it. New lines keep the indentation of the line above.',
    '在 `[[div]]` 后回车时自动加上 `[[/div]]`，并缩进中间的一行；在未写完的标签中回车会先补全标签。新行保持上一行的缩进。',
  ),
  saveTimeout: t('Save timeout (seconds)', '保存超时（秒）'),
  saveTimeoutHint: t(
    'If saving a page or a post gets no response in this time, show an error so you can save again. 0 waits forever.',
    '保存页面或发帖超过这个时间没有响应时，提示失败，可以重新保存。0 表示一直等待。',
  ),
  reset: t('Restore defaults', '恢复默认设置'),
  resetConfirm: t(
    'This restores **all settings** to their defaults. This cannot be undone.',
    '这会把**全部设置**恢复为默认值。此操作无法撤销。',
  ),
  resetYes: t('Restore all', '全部恢复'),
  cancel: t('Cancel', '取消'),
  saved: t('Saved', '已保存'),
}

export type MessageKey = keyof typeof MESSAGES
