const form = document.querySelector('#form');
const input = document.querySelector('#appUrl');
const status = document.querySelector('#status');
chrome.storage.sync.get({ appUrl: '' }, data => { input.value = data.appUrl; });
form.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const parsed = new URL(input.value.trim());
    if (parsed.protocol !== 'https:') throw new Error('Use the HTTPS URL of your deployed workspace.');
    parsed.hash = ''; parsed.search = '';
    parsed.pathname = parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`;
    await chrome.storage.sync.set({ appUrl: parsed.href });
    status.textContent = 'Saved. Select text on any webpage and right-click → Add selection to Roughbook.';
  } catch (error) { status.textContent = error.message || 'Enter a valid HTTPS URL.'; }
});
