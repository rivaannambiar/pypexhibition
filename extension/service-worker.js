const MENU_ID = 'exhibition-workspace-save-to-roughbook';
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Add selection to Roughbook',
      contexts: ['selection']
    });
  });
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText || !tab?.url) return;
  const { appUrl } = await chrome.storage.sync.get({ appUrl: '' });
  const base = (appUrl || '').trim();
  if (!/^https:\/\//i.test(base)) {
    chrome.runtime.openOptionsPage();
    return;
  }
  const target = new URL('roughbook.html', base.endsWith('/') ? base : `${base}/`);
  target.searchParams.set('clip', info.selectionText.slice(0, 2600));
  target.searchParams.set('source', tab.url);
  target.searchParams.set('title', (tab.title || 'Webpage').slice(0, 180));
  chrome.tabs.create({ url: target.toString() });
});
