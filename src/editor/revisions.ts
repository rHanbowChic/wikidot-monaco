import { readPageSource } from './pageSource'

/** Fetches the source of a page revision, as wikidot's history "S" button shows it. */
export async function fetchRevisionSource(revisionId: string): Promise<string> {
  const token = document.cookie.match(/(?:^|;\s*)wikidot_token7=([^;]*)/)?.[1]
  if (!token) throw new Error('no wikidot_token7 cookie')
  const response = await fetch('/ajax-module-connector.php', {
    method: 'POST',
    body: new URLSearchParams({
      moduleName: 'history/PageSourceModule',
      revision_id: revisionId,
      wikidot_token7: token,
    }),
  })
  const json = (await response.json()) as { status: string; body?: string }
  if (json.status !== 'ok' || !json.body) throw new Error(`revision ${revisionId}: ${json.status}`)
  const div = new DOMParser()
    .parseFromString(json.body, 'text/html')
    .querySelector<HTMLElement>('div.page-source')
  if (!div) throw new Error(`revision ${revisionId}: no page-source`)
  return readPageSource(div)
}
