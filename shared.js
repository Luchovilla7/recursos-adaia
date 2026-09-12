/* Utilidades compartidas entre páginas del vault: copiar al portapapeles y mostrar un toast.
   Requiere un elemento #toast con un hijo .toast-text donde escribir el mensaje. */

let toastTimer;

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  if (message != null) {
    const textEl = toast.querySelector('.toast-text');
    if (textEl) textEl.textContent = message;
  }
  clearTimeout(toastTimer);
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // sigue al fallback de abajo
    }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}
