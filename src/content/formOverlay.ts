/**
 * Injects a small "Form Seeder" action button into the top-left corner of every
 * detected form.  Clicking the button opens a context menu with fill options.
 */

import { FormConfig } from '../types/config';
import { fillFormRandom, fillFormWithValues } from './formFiller';

const INJECTED_ATTR = 'data-fs-injected';

// ─── SVG icon (inline, 20×20) ─────────────────────────────────────────────────

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
  <rect x="2" y="2" width="20" height="22" rx="2.5" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
  <rect x="2" y="2" width="20" height="8" rx="2.5" fill="#2563eb"/>
  <rect x="2" y="7" width="20" height="3" fill="#2563eb"/>
  <rect x="5" y="13" width="14" height="2" rx="1" fill="#bfdbfe"/>
  <rect x="5" y="17" width="9" height="2" rx="1" fill="#bfdbfe"/>
  <line x1="17" y1="20" x2="17" y2="24" stroke="#15803d" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M17 22 C14 19 10 20 11 23 C13 21 16 21 17 22" fill="#16a34a"/>
  <path d="M17 22 C20 19 24 20 23 23 C21 21 18 21 17 22" fill="#22c55e"/>
</svg>`;

// ─── Button ───────────────────────────────────────────────────────────────────

function createButton(): HTMLDivElement {
  const btn        = document.createElement('div');
  btn.innerHTML    = ICON_SVG;
  btn.title        = 'Form Seeder – click to fill this form';
  btn.setAttribute('data-fs', 'btn');
  btn.style.cssText = `
    position:absolute; top:4px; left:4px;
    z-index:2147483647;
    width:26px; height:26px;
    display:flex; align-items:center; justify-content:center;
    background:#fff;
    border:1.5px solid #2563eb;
    border-radius:6px;
    box-shadow:0 1px 4px rgba(0,0,0,.15);
    cursor:pointer;
    user-select:none;
    padding:2px;
    box-sizing:border-box;
  `;
  return btn;
}

// ─── Context menu ─────────────────────────────────────────────────────────────

function createMenuButton(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = `
    display:block; width:100%;
    padding:7px 12px;
    text-align:left; border:none;
    background:none; cursor:pointer;
    color:#1e293b; font-size:13px;
    font-family:system-ui,-apple-system,sans-serif;
    white-space:nowrap;
  `;
  btn.addEventListener('mouseenter', () => { btn.style.background = '#f0f9ff'; });
  btn.addEventListener('mouseleave', () => { btn.style.background = 'none'; });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  return btn;
}

function createSeparator(): HTMLDivElement {
  const sep = document.createElement('div');
  sep.style.cssText = 'height:1px; background:#e2e8f0; margin:2px 0;';
  return sep;
}

function buildMenu(
  form: HTMLFormElement,
  formConfig: FormConfig | null,
  onClose: () => void,
): HTMLDivElement {
  const menu = document.createElement('div');
  menu.setAttribute('data-fs', 'menu');
  menu.style.cssText = `
    position:absolute; top:34px; left:4px;
    z-index:2147483647;
    background:#fff;
    border:1px solid #e2e8f0;
    border-radius:8px;
    box-shadow:0 4px 12px rgba(0,0,0,.15);
    min-width:190px;
    overflow:hidden;
  `;

  const close = () => { menu.remove(); onClose(); };

  menu.appendChild(
    createMenuButton('🎲 Fill Random', () => { fillFormRandom(form, formConfig); close(); }),
  );

  if (formConfig) {
    menu.appendChild(
      createMenuButton('🌱 Fill Seeded', () => { fillFormRandom(form, formConfig); close(); }),
    );

    if (formConfig.namedFills.length > 0) {
      menu.appendChild(createSeparator());
      formConfig.namedFills.forEach(fill => {
        menu.appendChild(
          createMenuButton(`📋 ${fill.name}`, () => {
            fillFormWithValues(form, fill.values);
            close();
          }),
        );
      });
    }
  }

  return menu;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Inject the seeder button into a form (idempotent). */
export function injectOverlay(
  form: HTMLFormElement,
  formConfig: FormConfig | null,
): void {
  if (form.hasAttribute(INJECTED_ATTR)) {
    // Update config on existing overlay (e.g. after config save)
    updateOverlayConfig(form, formConfig);
    return;
  }
  form.setAttribute(INJECTED_ATTR, 'true');

  // Ensure relative positioning so our absolute button stays inside the form
  if (window.getComputedStyle(form).position === 'static') {
    form.style.position = 'relative';
  }

  const btn = createButton();
  form.insertBefore(btn, form.firstChild);

  let menu: HTMLDivElement | null = null;
  let currentConfig               = formConfig;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (menu) { menu.remove(); menu = null; return; }

    menu = buildMenu(form, currentConfig, () => { menu = null; });
    form.appendChild(menu);

    const onOutsideClick = (ev: MouseEvent) => {
      if (menu && !menu.contains(ev.target as Node) && ev.target !== btn) {
        menu.remove();
        menu = null;
        document.removeEventListener('click', onOutsideClick, true);
      }
    };
    // Defer so the current click doesn't immediately close the menu
    setTimeout(() => document.addEventListener('click', onOutsideClick, true), 0);
  });

  // Expose a method on the element for config updates
  (form as HTMLFormElement & { _fsUpdateConfig?: (c: FormConfig | null) => void })._fsUpdateConfig =
    (c) => { currentConfig = c; };
}

/** Update the config reference on an already-injected overlay. */
export function updateOverlayConfig(
  form: HTMLFormElement,
  formConfig: FormConfig | null,
): void {
  const updater = (form as HTMLFormElement & { _fsUpdateConfig?: (c: FormConfig | null) => void })._fsUpdateConfig;
  if (updater) updater(formConfig);
}
