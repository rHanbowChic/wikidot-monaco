// Wikidot markup reference used by completion and folding.
// Source: https://merula.ect.fyi/doc-wiki-syntax/ and https://merula.ect.fyi/doc-modules/
import { t, type Text } from '../../i18n'

export interface AttrSpec {
  name: string
  doc?: Text
  values?: string[]
}

export interface TagSpec {
  /** Text right after `[[`, e.g. `div`, `f<image`, `<`. */
  name: string
  detail: Text
  /** How the closing tag is placed: on its own line, right after the content, or none. */
  close?: 'block' | 'inline'
  /** Name used in the closing tag when it differs from `name` (`div_` closes with `[[/div]]`). */
  closeName?: string
  /** Snippet for the positional argument following the name. */
  arg?: string | Text
  /** Snippet for the content between the tags. */
  body?: string | Text
  /** Complete snippet for tags whose form does not fit the generic shape. */
  snippet?: string
  attrs?: AttrSpec[]
  /** Values offered right after the name (`[[size |`). */
  argValues?: string[]
  doc?: Text
}

const html = (...extra: AttrSpec[]): AttrSpec[] => [
  { name: 'id', doc: t('Automatically prefixed with `u-`', '会自动加上 `u-` 前缀') },
  { name: 'class' },
  { name: 'style' },
  { name: 'data-', doc: t('Any `data-*` attribute', '任意 `data-*` 属性') },
  ...extra,
]
const styled: AttrSpec[] = [{ name: 'style' }, { name: 'class' }]
const cellAttrs: AttrSpec[] = [...styled, { name: 'colspan' }, { name: 'rowspan' }]

const imageAttrs: AttrSpec[] = [
  {
    name: 'link',
    doc: t(
      'Page name, URL, `#anchor` or `#`; prefix with `*` to open in a new window',
      '页面名、URL、`#anchor` 或 `#`；前加 `*` 在新窗口打开',
    ),
  },
  { name: 'alt', doc: t('Text shown when the image is unavailable', '图片不可用时的替代文本') },
  { name: 'title', doc: t('Hover text', '鼠标悬停文本') },
  { name: 'width', doc: t('e.g. `200px`', '如 `200px`') },
  { name: 'height', doc: t('e.g. `200px`', '如 `200px`') },
  { name: 'style' },
  { name: 'class' },
  {
    name: 'size',
    doc: t(
      'Resized version; only for attached or Flickr images',
      '缩放尺寸，仅对本地或 Flickr 图片有效',
    ),
    values: ['square', 'thumbnail', 'small', 'medium', 'medium640', 'large', 'original'],
  },
]
const imageDoc = t(
  '`[[image source attributes...]]`\n\nThe source can be a URL, an attachment of this page `file.jpg`, `:first`, an attachment of another page `/page/file.jpg`, or `flickr:photoid`.',
  '`[[image 来源 属性...]]`\n\n来源可以是 URL、本页附件 `file.jpg`、`:first`、其他页面附件 `/page/file.jpg`、`flickr:photoid`。',
)

const SIZE_VALUES = [
  'smaller',
  'larger',
  'xx-small',
  'x-small',
  'small',
  'large',
  'x-large',
  'xx-large',
  '80%',
  '150%',
  '0.8em',
  '1.5em',
  '12px',
]

const CODE_TYPES = [
  'php',
  'html',
  'cpp',
  'css',
  'diff',
  'dtd',
  'java',
  'javascript',
  'perl',
  'python',
  'ruby',
  'xml',
]

const MATH_TYPES = [
  'align',
  'alignat',
  'aligned',
  'alignedat',
  'array',
  'Bmatrix',
  'bmatrix',
  'cases',
  'eqnarray',
  'equation',
  'gather',
  'gathered',
  'matrix',
  'multline',
  'pmatrix',
  'smallmatrix',
  'split',
  'subarray',
  'Vmatrix',
  'vmatrix',
]

const BUTTON_TYPES = [
  'edit',
  'edit-append',
  'edit-sections',
  'history',
  'print',
  'files',
  'tags',
  'source',
  'backlinks',
  'talk',
  'delete',
  'rename',
  'site-tools',
  'edit-meta',
  'watchers',
  'parent',
  'lock-page',
  'set-tags',
]

const imageVariants: [string, Text][] = [
  ['image', t('Image', '图片')],
  ['=image', t('Centered image', '居中图片')],
  ['<image', t('Left-aligned image', '左对齐图片')],
  ['>image', t('Right-aligned image', '右对齐图片')],
  ['f<image', t('Image floated left (text wraps)', '左浮动图片（文字环绕）')],
  ['f>image', t('Image floated right (text wraps)', '右浮动图片（文字环绕）')],
]

export const TAGS: TagSpec[] = [
  // Layout and blocks
  {
    name: 'div',
    detail: t('Custom div block', '自定义 div 块'),
    close: 'block',
    attrs: html(),
    doc: t(
      '`[[div]]` and `[[/div]]` must each be on their own line; can be nested.',
      '`[[div]]` 与 `[[/div]]` 须各自独占一行，可嵌套。',
    ),
  },
  {
    name: 'div_',
    closeName: 'div',
    detail: t('div (strips surrounding whitespace)', 'div（去除周围空白）'),
    close: 'block',
    attrs: html(),
  },
  { name: 'span', detail: t('Custom span', '自定义 span'), close: 'inline', attrs: html() },
  {
    name: 'span_',
    closeName: 'span',
    detail: t('span (strips surrounding whitespace)', 'span（去除周围空白）'),
    close: 'inline',
    attrs: html(),
  },
  {
    name: 'a',
    detail: t('Link element', '链接元素'),
    close: 'inline',
    attrs: html({ name: 'href' }),
  },
  {
    name: 'a_',
    closeName: 'a',
    detail: t('Link element (strips surrounding whitespace)', '链接元素（去除周围空白）'),
    close: 'inline',
    attrs: html({ name: 'href' }),
  },
  { name: '<', detail: t('Left-aligned block', '左对齐块'), close: 'block' },
  { name: '>', detail: t('Right-aligned block', '右对齐块'), close: 'block' },
  { name: '=', detail: t('Centered block', '居中块'), close: 'block' },
  { name: '==', detail: t('Justified block', '两端对齐块'), close: 'block' },
  {
    name: 'size',
    detail: t('Text size', '文字大小'),
    close: 'inline',
    arg: '${1|' + SIZE_VALUES.join(',') + '|}',
    argValues: SIZE_VALUES,
    doc: t(
      'Relative: `smaller` `larger` `n%` `nem`; absolute: `xx-small` … `xx-large` `npx`.',
      '相对大小：`smaller` `larger` `n%` `nem`；绝对大小：`xx-small` … `xx-large` `npx`。',
    ),
  },
  {
    name: 'collapsible',
    detail: t('Collapsible block', '折叠块'),
    close: 'block',
    attrs: [
      {
        name: 'show',
        doc: t('Text shown while folded, e.g. `+ show`', '折叠时显示的文字，如 `+ 展开`'),
      },
      {
        name: 'hide',
        doc: t('Text shown while unfolded, e.g. `- hide`', '展开时显示的文字，如 `- 折叠`'),
      },
      { name: 'folded', values: ['yes', 'no'] },
      { name: 'hideLocation', values: ['top', 'bottom', 'both'] },
    ],
  },
  { name: 'note', detail: t('Note box', '提示框'), close: 'block' },
  {
    name: 'tabview',
    detail: t('Tab view', '标签页容器'),
    close: 'block',
    body: t(
      '[[tab ${1:Title 1}]]\n${2}\n[[/tab]]\n[[tab ${3:Title 2}]]\n${0}\n[[/tab]]',
      '[[tab ${1:标题 1}]]\n${2}\n[[/tab]]\n[[tab ${3:标题 2}]]\n${0}\n[[/tab]]',
    ),
    doc: t(
      'TabViews cannot be nested, and they affect the table of contents and anchor links.',
      'TabView 不能嵌套，且会影响目录与锚点链接。',
    ),
  },
  { name: 'tab', detail: t('Tab', '标签页'), close: 'block', arg: t('${1:Title}', '${1:标题}') },

  // Code and embedding
  {
    name: 'code',
    detail: t('Code block', '代码块'),
    close: 'block',
    attrs: [{ name: 'type', values: CODE_TYPES }],
    doc: t(
      'Wiki syntax inside is not parsed (except `[[include]]`).',
      '块内 wiki 语法不会被解析（`[[include]]` 除外）。',
    ),
  },
  {
    name: 'html',
    detail: t('HTML block (rendered in an iframe)', 'HTML 块（iframe 内渲染）'),
    close: 'block',
  },
  { name: 'embed', detail: t('Embed third-party code', '嵌入第三方代码'), close: 'block' },
  { name: 'embedvideo', detail: t('Embed video', '嵌入视频'), close: 'block' },
  { name: 'embedaudio', detail: t('Embed audio', '嵌入音频'), close: 'block' },
  {
    name: 'iframe',
    detail: t('Inline frame', '内嵌网页'),
    arg: '${1:url}',
    attrs: [
      { name: 'frameborder', values: ['0', '1'] },
      { name: 'align', values: ['left', 'right', 'top', 'bottom', 'middle'] },
      { name: 'height', doc: t('Pixels or %', '像素或 %') },
      { name: 'width', doc: t('Pixels or %', '像素或 %') },
      { name: 'scrolling', values: ['yes', 'no'] },
      { name: 'class' },
      { name: 'style' },
    ],
  },

  // Images and files
  ...imageVariants.map(([name, detail]): TagSpec => ({
    name,
    detail,
    arg: '${1:source}',
    attrs: imageAttrs,
    doc: imageDoc,
  })),
  {
    name: 'gallery',
    detail: t('Image gallery', '图片画廊'),
    attrs: [
      { name: 'size', values: ['square', 'thumbnail', 'small', 'medium'] },
      { name: 'order', values: ['name', 'name desc', 'created_at', 'created_at desc'] },
      { name: 'viewer', values: ['yes', 'no', 'true', 'false'] },
    ],
    doc: t(
      'On its own, shows all image attachments of the page; can also take a `: source attributes` list closed by `[[/gallery]]`.',
      '单独使用时显示本页所有图片附件；也可配合 `: 来源 属性` 列表与 `[[/gallery]]` 使用。',
    ),
  },
  { name: 'file', detail: t('File link', '附件链接'), arg: '${1:filename}${2: | ${3:text}}' },

  // Tables and lists
  {
    name: 'table',
    detail: t('Advanced table', '高级表格'),
    close: 'block',
    attrs: styled,
    body: '[[row]]\n[[cell]]\n${0}\n[[/cell]]\n[[/row]]',
  },
  { name: 'row', detail: t('Table row', '表格行'), close: 'block', attrs: styled },
  { name: 'cell', detail: t('Table cell', '表格单元格'), close: 'block', attrs: cellAttrs },
  { name: 'hcell', detail: t('Table header cell', '表头单元格'), close: 'block', attrs: cellAttrs },
  { name: 'ul', detail: t('Unordered list', '无序列表'), close: 'block', attrs: html() },
  {
    name: 'ul_',
    closeName: 'ul',
    detail: t('Unordered list (strips surrounding whitespace)', '无序列表（去除周围空白）'),
    close: 'block',
    attrs: html(),
  },
  { name: 'ol', detail: t('Ordered list', '有序列表'), close: 'block', attrs: html() },
  {
    name: 'ol_',
    closeName: 'ol',
    detail: t('Ordered list (strips surrounding whitespace)', '有序列表（去除周围空白）'),
    close: 'block',
    attrs: html(),
  },
  { name: 'li', detail: t('List item', '列表项'), close: 'inline', attrs: html() },
  {
    name: 'li_',
    closeName: 'li',
    detail: t('List item (strips surrounding whitespace)', '列表项（去除周围空白）'),
    close: 'inline',
    attrs: html(),
  },

  // Notes and references
  { name: 'footnote', detail: t('Footnote', '脚注'), close: 'inline' },
  {
    name: 'footnoteblock',
    detail: t('Footnote list position', '脚注列表位置'),
    attrs: [{ name: 'title' }],
  },
  {
    name: 'bibliography',
    detail: t('Bibliography', '参考文献'),
    close: 'block',
    attrs: [{ name: 'title' }],
    body: ': ${1:label} : ${0:full reference}',
    doc: t('Cite an entry with `((bibcite label))`', '引用条目：`((bibcite label))`'),
  },
  {
    name: 'math',
    detail: t('Equation block (LaTeX)', '公式块（LaTeX）'),
    close: 'block',
    arg: '${1:label}',
    attrs: [{ name: 'type', values: MATH_TYPES }],
  },
  { name: '$', detail: t('Inline math', '行内公式'), snippet: '\\$ ${1} \\$]]' },
  { name: 'eref', detail: t('Equation reference', '引用公式编号'), arg: '${1:label}' },
  { name: 'toc', detail: t('Table of contents', '目录') },
  { name: 'f<toc', detail: t('Table of contents floated left', '左浮动目录') },
  { name: 'f>toc', detail: t('Table of contents floated right', '右浮动目录') },
  { name: '#', detail: t('Anchor', '锚点'), arg: '${1:anchor-name}' },

  // Dynamic content
  {
    name: 'include',
    detail: t('Include page', '包含页面'),
    arg: '${1:page-name}',
    doc: t(
      '`[[include :site:page]]` includes across sites; pass variables with `|var=value` and use them as `{$var}` in the included page.',
      '`[[include :site:page]]` 可跨站包含；变量用 `|var=value` 传入，在被包含页中写作 `{$var}`。',
    ),
  },
  {
    name: 'iftags',
    detail: t('Show by page tags', '按标签条件显示'),
    close: 'block',
    arg: '${1:+tag}',
    doc: t(
      '`+tag` must be present, `-tag` must be absent; no prefix means `+`.',
      '`+tag` 必须存在，`-tag` 必须不存在，无前缀等同 `+`。',
    ),
  },
  {
    name: 'module',
    detail: t('Module', '模块'),
    arg: '${1:ListPages}',
    doc: t('Type a space to complete module names.', '输入空格后可补全模块名。'),
  },
  { name: 'head', detail: t('ListPages header', 'ListPages 头部'), close: 'block' },
  { name: 'body', detail: t('ListPages body', 'ListPages 主体'), close: 'block' },
  { name: 'foot', detail: t('ListPages footer', 'ListPages 尾部'), close: 'block' },
  {
    name: 'date',
    detail: t('Date', '日期'),
    arg: '${1:timestamp}',
    attrs: [{ name: 'format', doc: t('e.g. `%e %B|agohover`', '如 `%e %B|agohover`') }],
  },
  { name: 'user', detail: t('User', '用户'), arg: '${1:user-name}' },
  { name: '*user', detail: t('User (with avatar)', '用户（带头像）'), arg: '${1:user-name}' },
  {
    name: 'button',
    detail: t('Page action button', '页面操作按钮'),
    arg: '${1|' + BUTTON_TYPES.join(',') + '|}',
    argValues: BUTTON_TYPES,
    attrs: [{ name: 'text' }, { name: 'class' }, { name: 'style' }],
    doc: t(
      '`set-tags` takes `+tag -tag -* -_*` to change tags.',
      '`set-tags` 后接 `+tag -tag -* -_*` 用于修改标签。',
    ),
  },
  { name: 'social', detail: t('Social bookmark buttons', '社交书签按钮') },
]

export interface ModuleSpec {
  name: string
  detail: Text
  /** Module takes a body closed by [[/module]]. */
  body?: boolean
  attrs?: AttrSpec[]
}

const selectors: AttrSpec[] = [
  { name: 'pagetype', values: ['normal', 'hidden', '*'] },
  {
    name: 'category',
    doc: t('`.` current category, `*` all, `-cat` exclude', '`.` 当前分类，`*` 全部，`-cat` 排除'),
    values: ['.', '*'],
  },
  {
    name: 'tags',
    doc: t(
      '`+tag` required, `-tag` excluded, `-` untagged, `=` same tags',
      '`+tag` 必须，`-tag` 排除，`-` 无标签，`=` 同标签',
    ),
    values: ['-', '=', '=='],
  },
  { name: 'parent', values: ['-', '=', '-=', '.'] },
  { name: 'link_to', values: ['.'] },
  {
    name: 'created_at',
    doc: t('`yyyy`, `yyyy.mm`, `last 7 day`, etc.', '`yyyy`、`yyyy.mm`、`last 7 day` 等'),
  },
  { name: 'updated_at' },
  { name: 'created_by', values: ['=', '-='] },
  { name: 'rating', values: ['='] },
  { name: 'votes', values: ['='] },
  { name: 'offset' },
  { name: 'range', values: ['.', 'before', 'after', 'others'] },
  { name: 'name', values: ['='] },
  { name: 'fullname' },
]

const ORDER_VALUES = [
  'name',
  'fullname',
  'title',
  'created_by',
  'created_at',
  'updated_at',
  'size',
  'rating',
  'votes',
  'revisions',
  'comments',
  'random',
].flatMap((p) => [p, `${p} desc`])

const yesNo = ['yes', 'no']

const listPagesAttrs: AttrSpec[] = [
  ...selectors,
  { name: 'order', values: ORDER_VALUES },
  { name: 'limit' },
  { name: 'perPage', doc: t('Items per page, default 20, max 250', '每页数量，默认 20，最大 250') },
  { name: 'reverse', values: ['yes'] },
  { name: 'separate', values: yesNo },
  { name: 'wrapper', values: yesNo },
  { name: 'prependLine' },
  { name: 'appendLine' },
  { name: 'urlAttrPrefix' },
  { name: 'rss' },
  { name: 'rssDescription' },
  { name: 'rssHome' },
  { name: 'rssLimit' },
  { name: 'rssOnly', values: ['true', 'yes'] },
]

const nextPrevAttrs: AttrSpec[] = [
  { name: 'category' },
  { name: 'by', values: ['title', 'date'] },
  { name: 'tags' },
]

export const MODULES: ModuleSpec[] = [
  { name: 'ListPages', detail: t('List pages', '列出页面'), body: true, attrs: listPagesAttrs },
  { name: 'CountPages', detail: t('Count pages', '统计页面数'), body: true, attrs: selectors },
  {
    name: 'CSS',
    detail: t('Page CSS', '页面 CSS'),
    body: true,
    attrs: [
      { name: 'show', values: ['true'] },
      { name: 'disable', values: ['true'] },
    ],
  },
  {
    name: 'ListUsers',
    detail: t('Current user info', '当前用户信息'),
    body: true,
    attrs: [{ name: 'users', values: ['.'] }],
  },
  { name: 'Rate', detail: t('Rating', '评分') },
  {
    name: 'Comments',
    detail: t('Page comments', '页面评论'),
    attrs: [
      { name: 'title' },
      { name: 'hide', values: ['true', 'false'] },
      { name: 'hideForm', values: ['true', 'yes', 'false'] },
      { name: 'order', values: ['reverse', 'forwards'] },
    ],
  },
  { name: 'Redirect', detail: t('Redirect', '重定向'), attrs: [{ name: 'destination' }] },
  {
    name: 'PageTree',
    detail: t('Page tree', '页面树'),
    attrs: [{ name: 'root' }, { name: 'showRoot', values: ['true', 'false'] }, { name: 'depth' }],
  },
  {
    name: 'TagCloud',
    detail: t('Tag cloud', '标签云'),
    attrs: [
      { name: 'mode', values: ['3d'] },
      { name: 'maxFontSize' },
      { name: 'minFontSize' },
      { name: 'maxColor' },
      { name: 'minColor' },
      { name: 'limit' },
      { name: 'target' },
      { name: 'category' },
      { name: 'showHidden', values: ['true', 'yes'] },
      { name: 'urlAttrPrefix' },
    ],
  },
  {
    name: 'NewPage',
    detail: t('New page form', '新建页面表单'),
    attrs: [
      { name: 'category' },
      { name: 'template' },
      { name: 'size' },
      { name: 'button' },
      { name: 'format' },
      { name: 'tags' },
      { name: 'parent' },
      { name: 'mode', values: ['edit', 'save-and-refresh', 'save-and-go'] },
      { name: 'goTo' },
    ],
  },
  {
    name: 'Join',
    detail: t('Join site button', '加入站点按钮'),
    attrs: [{ name: 'button' }, { name: 'class' }],
  },
  { name: 'NextPage', detail: t('Next page link', '下一页链接'), attrs: nextPrevAttrs },
  { name: 'PreviousPage', detail: t('Previous page link', '上一页链接'), attrs: nextPrevAttrs },
  {
    name: 'Feed',
    detail: t('RSS feed', 'RSS 订阅'),
    attrs: [{ name: 'src' }, { name: 'limit' }, { name: 'offset' }],
  },
  {
    name: 'FrontForum',
    detail: t('Recent posts in forum categories', '论坛分类新帖'),
    attrs: [{ name: 'category' }],
  },
  { name: 'MailForm', detail: t('Mail form', '邮件表单'), body: true },
  { name: 'Backlinks', detail: t('Backlinks', '反向链接') },
  { name: 'Files', detail: t('File list', '附件列表') },
  { name: 'Categories', detail: t('Category list', '分类列表') },
  { name: 'ChildPages', detail: t('Child pages (deprecated)', '子页面（已弃用）') },
  { name: 'Clone', detail: t('Clone site', '克隆站点') },
  { name: 'AdSenseUnit', detail: t('AdSense ad', 'AdSense 广告') },
  { name: 'FeaturedSite', detail: t('Featured sites', '推荐站点') },
  { name: 'FlickrGallery', detail: t('Flickr gallery', 'Flickr 画廊') },
  { name: 'ListDrafts', detail: t('Draft list', '草稿列表') },
  { name: 'ManageSite', detail: t('Site manager', '站点管理') },
  { name: 'Members', detail: t('Member list', '成员列表') },
  { name: 'MembershipApply', detail: t('Apply for membership', '申请加入') },
  { name: 'MembershipByPassword', detail: t('Join with password', '密码加入') },
  { name: 'MiniActiveThreads', detail: t('Active threads (mini)', '活跃讨论（迷你）') },
  { name: 'MiniRecentPosts', detail: t('Recent posts (mini)', '最新帖子（迷你）') },
  { name: 'MiniRecentThreads', detail: t('Recent threads (mini)', '最新讨论（迷你）') },
  { name: 'OrphanedPages', detail: t('Orphaned pages', '孤立页面') },
  { name: 'PageCalendar', detail: t('Page calendar', '页面日历'), attrs: [{ name: 'category' }] },
  { name: 'Pages', detail: t('Page list (legacy)', '页面列表（旧）') },
  { name: 'PagesByTag', detail: t('Pages by tag (deprecated)', '按标签列页面（已弃用）') },
  { name: 'PetitionAdmin', detail: t('Petition admin', '请愿管理') },
  { name: 'RatedPages', detail: t('Top-rated pages', '高分页面') },
  { name: 'RecentPosts', detail: t('Recent posts', '最新帖子') },
  { name: 'Search', detail: t('Site search', '站内搜索') },
  { name: 'SearchAll', detail: t('Search all sites', '全站搜索') },
  { name: 'SearchUsers', detail: t('Search users', '搜索用户') },
  { name: 'SendInvitations', detail: t('Send invitations', '发送邀请') },
  { name: 'SiteChanges', detail: t('Recent changes', '最近更改') },
  { name: 'SiteGrid', detail: t('Site grid', '站点网格') },
  { name: 'ThemePreviewer', detail: t('Theme previewer', '主题预览') },
  { name: 'WantedPages', detail: t('Wanted pages', '待创建页面') },
  { name: 'Watchers', detail: t('Watchers', '关注者') },
  { name: 'WhoInvited', detail: t('Who invited', '邀请人') },
]

/** ListPages body variables, written without the surrounding `%%`. */
export const LISTPAGES_VARS: [string, Text][] = [
  ['created_at', t('Creation time', '创建时间')],
  ['created_by', t('Author', '创建者')],
  ['created_by_unix', t('Author (unix name)', '创建者（unix 名）')],
  ['created_by_id', t('Author ID', '创建者 ID')],
  ['created_by_linked', t('Author (linked)', '创建者（带链接）')],
  ['updated_at', t('Last edit time', '更新时间')],
  ['updated_by', t('Last editor', '更新者')],
  ['updated_by_unix', t('Last editor (unix name)', '更新者（unix 名）')],
  ['updated_by_id', t('Last editor ID', '更新者 ID')],
  ['updated_by_linked', t('Last editor (linked)', '更新者（带链接）')],
  ['commented_at', t('Last comment time', '最后评论时间')],
  ['commented_by', t('Last commenter', '最后评论者')],
  ['commented_by_unix', t('Last commenter (unix name)', '最后评论者（unix 名）')],
  ['commented_by_id', t('Last commenter ID', '最后评论者 ID')],
  ['commented_by_linked', t('Last commenter (linked)', '最后评论者（带链接）')],
  ['name', t('Page name (without category)', '页面名（不含分类）')],
  ['category', t('Category', '分类')],
  ['fullname', t('Full page name', '完整页面名')],
  ['title', t('Title', '标题')],
  ['title_linked', t('Title (linked)', '标题（带链接）')],
  ['parent_name', t('Parent page name', '父页面名')],
  ['parent_category', t('Parent page category', '父页面分类')],
  ['parent_fullname', t('Parent full page name', '父页面完整名')],
  ['parent_title', t('Parent page title', '父页面标题')],
  ['parent_title_linked', t('Parent page title (linked)', '父页面标题（带链接）')],
  ['link', t('Page URL', '页面 URL')],
  ['content', t('Page content', '页面内容')],
  ['content{1}', t('Content section n', '第 n 段内容')],
  ['preview', t('First 200 characters', '前 200 字符')],
  ['preview(100)', t('First n characters', '前 n 字符')],
  ['summary', t('Content summary', '内容摘要')],
  ['first_paragraph', t('First paragraph', '第一段')],
  ['tags', t('Visible tags', '可见标签')],
  ['tags_linked', t('Visible tags (linked)', '可见标签（带链接）')],
  ['_tags', t('Hidden tags', '隐藏标签')],
  ['_tags_linked', t('Hidden tags (linked)', '隐藏标签（带链接）')],
  ['form_data{name}', t('Data form field value', '数据表单字段值')],
  ['form_raw{name}', t('Data form raw value', '数据表单原始值')],
  ['form_label{name}', t('Data form field label', '数据表单字段标签')],
  ['form_hint{name}', t('Data form field hint', '数据表单字段提示')],
  ['children', t('Number of child pages', '子页面数')],
  ['comments', t('Number of comments', '评论数')],
  ['size', t('Number of characters', '字符数')],
  ['rating', t('Rating', '评分')],
  ['rating_votes', t('Number of votes', '投票数')],
  ['rating_percent', t('Five-star rating percentage', '五星评分百分比')],
  ['revisions', t('Number of revisions', '修订数')],
  ['index', t('Index', '序号')],
  ['total', t('Total', '总数')],
  ['limit', t('limit argument', 'limit 参数')],
  ['total_or_limit', t('Number of items shown', '实际输出数量')],
  ['site_title', t('Site title', '站点标题')],
  ['site_name', t('Site unix name', '站点 unix 名')],
  ['site_domain', t('Site domain', '站点域名')],
]

/** Tags whose closing form `[[/name]]` is meaningful, used for folding and `[[/` completion. */
export const PAIRED = new Set(
  TAGS.filter((t) => t.close)
    .map((t) => t.closeName ?? t.name)
    .concat('module'),
)
