// ── PWA Service Worker ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW enregistré:', reg.scope))
      .catch(err => console.log('SW erreur:', err));
  });
}

// ── Prompt installation PWA ──
let _deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredPrompt = e;
  // Afficher bouton d'installation discret
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'flex';
});
window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'none';
  _deferredPrompt = null;
});
function installPWA() {
  if (!_deferredPrompt) return;
  _deferredPrompt.prompt();
  _deferredPrompt.userChoice.then(choice => {
    _deferredPrompt = null;
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'none';
  });
}
