import { MESSAGE_OPEN_OPTIONS } from './settings'

// The toolbar icon and the editor's context menu open the settings page.
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage())
chrome.runtime.onMessage.addListener((message) => {
  if (message === MESSAGE_OPEN_OPTIONS) chrome.runtime.openOptionsPage()
})
