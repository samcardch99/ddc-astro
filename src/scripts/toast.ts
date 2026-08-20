type ToastType = 'success' | 'error';

interface ToastOptions {
  description?: string;
  duration?: number;
}

function container(): HTMLElement | null {
  return document.getElementById('ddc-toaster');
}

function show(type: ToastType, title: string, options: ToastOptions = {}): void {
  const host = container();
  if (!host) return;

  const el = document.createElement('div');
  el.className = 'ddc-toast';
  el.dataset.type = type;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const heading = document.createElement('p');
  heading.className = 'ddc-toast__title';
  heading.textContent = title;
  el.appendChild(heading);

  if (options.description) {
    const description = document.createElement('p');
    description.className = 'ddc-toast__description';
    description.textContent = options.description;
    el.appendChild(description);
  }

  host.appendChild(el);
  requestAnimationFrame(() => {
    el.dataset.visible = 'true';
  });

  const duration = options.duration ?? 5000;
  window.setTimeout(() => {
    el.dataset.visible = 'false';
    window.setTimeout(() => el.remove(), 300);
  }, duration);
}

export const toast = {
  success: (title: string, options?: ToastOptions) => show('success', title, options),
  error: (title: string, options?: ToastOptions) => show('error', title, options),
};
