// Gives wikidot's ajax actions (saving a page, posting, ...) a timeout. init.combined.js sends
// them through YAHOO.util.Connect without one, so a request that never answers leaves
// "Saving page..." up forever. YUI aborts a request whose callback carries `timeout` and
// reports it to `failure` with status -1; this handles that like a failed request: alert,
// then close the dialog and overlay so the user can save again.
import { t, tr, type Text } from '../i18n'

const CONNECTOR = '/ajax-module-connector.php'

const TIMED_OUT: Text = t(
  'The request timed out. Please check your internet connection and try again.\n\nThe server may still have received it: if saving again reports an error, reload the page to see whether your changes were saved.',
  '请求超时，请检查网络连接后重试。\n\n服务器可能已经收到了这次请求：如果再次保存时报错，请刷新页面确认修改是否已保存。',
)

interface Response {
  status: number
}

interface Callback {
  success?(response: Response): void
  failure?(response: Response): void
  timeout?: number
}

interface Connect {
  asyncRequest(method: string, uri: string, callback?: Callback, body?: string): unknown
}

interface Wikidot {
  YAHOO?: { util?: { Connect?: Connect } }
  OZONE?: { visuals: { cursorClear(): void }; dialog: { cleanAll(): void } }
}

/** `seconds()` is read per request, so settings changes apply right away; 0 disables. */
export function installTimeout(seconds: () => number) {
  const page = window as unknown as Wikidot
  const connect = page.YAHOO?.util?.Connect
  if (!connect) return
  const asyncRequest = connect.asyncRequest
  connect.asyncRequest = function (method, uri, callback, body) {
    const timeout = seconds() * 1000
    // Only actions: these are the requests that change something and wait in a dialog.
    if (timeout > 0 && uri === CONNECTOR && callback && !callback.timeout && isAction(body)) {
      const failure = callback.failure
      callback = {
        ...callback,
        timeout,
        failure(response) {
          if (response.status !== -1) return failure?.call(this, response)
          alert(tr(TIMED_OUT))
          page.OZONE?.visuals.cursorClear()
          page.OZONE?.dialog.cleanAll()
        },
      }
    }
    return asyncRequest.call(this, method, uri, callback, body)
  }
}

function isAction(body: string | undefined) {
  return new URLSearchParams(body).has('action')
}
