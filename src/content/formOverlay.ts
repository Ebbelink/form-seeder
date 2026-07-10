/**
 * Injects a small "Form Seeder" action button into the top-left corner of every
 * detected form.  Clicking the button opens a context menu with fill options.
 */

import { FieldConfig, FormConfig, NamedFill } from '../types/config';
import { saveFormConfig, upsertNamedFill } from '../utils/configManager';
import { getFieldKey } from '../utils/formId';
import { fillFormRandom, fillFormWithValues, getCurrentFormValues } from './formFiller';

const INJECTED_ATTR = 'data-fs-injected';

const ICON_URL = (globalThis as {
  chrome?: { runtime?: { getURL?: (path: string) => string } };
}).chrome?.runtime?.getURL?.('icons/form-seeder-icon.png') ?? 'icons/form-seeder-icon.png';

const SKIP_INPUT_TYPES = new Set(['hidden', 'submit', 'reset', 'button', 'file', 'image']);

type InteractiveField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isInteractiveField(el: Element): el is InteractiveField {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement
  );
}

function buildDefaultFieldConfigs(form: HTMLFormElement): FieldConfig[] {
  return Array.from(form.elements)
    .filter(isInteractiveField)
    .map((field, idx) => {
      const type = field instanceof HTMLInputElement
        ? field.type.toLowerCase()
        : field.tagName.toLowerCase();
      return { field, idx, type };
    })
    .filter(({ type }) => !SKIP_INPUT_TYPES.has(type))
    .map(({ field, idx, type }) => ({
      inputName: getFieldKey(field, idx),
      inputType: type,
    }));
}

// ─── Button ───────────────────────────────────────────────────────────────────

function createButton(): HTMLDivElement {
  const btn        = document.createElement('div');
  const img        = document.createElement('img');
  img.src          = ICON_URL;
  img.alt          = 'Form Seeder';
  img.style.width  = '18px';
  img.style.height = '18px';
  btn.appendChild(img);
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

function createMenuButton(label: string, onClick: () => void | Promise<void>): HTMLButtonElement {
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
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await onClick();
  });
  return btn;
}

function createSeparator(): HTMLDivElement {
  const sep = document.createElement('div');
  sep.style.cssText = 'height:1px; background:#e2e8f0; margin:2px 0;';
  return sep;
}

function createMenuLabel(label: string): HTMLDivElement {
  const row = document.createElement('div');
  row.textContent = label;
  row.style.cssText = `
    display:block; width:100%;
    padding:7px 12px;
    color:#475569; font-size:12px;
    font-family:system-ui,-apple-system,sans-serif;
    text-transform:uppercase; letter-spacing:.02em;
  `;
  return row;
}

function buildMenu(
  form: HTMLFormElement,
  formConfig: FormConfig | null,
  formId: string,
  formIndex: number,
  urlPattern: string,
  onConfigUpdated: (config: FormConfig) => void,
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

  menu.appendChild(
    createMenuButton('💾 Save current values as named fill', async () => {
      const fillName = window.prompt('Enter a name for this fill:');
      if (!fillName?.trim()) return;

      const values = getCurrentFormValues(form);
      const namedFill: NamedFill = { name: fillName.trim(), values };

      const nextConfig: FormConfig = formConfig ?? {
        id: formId,
        urlPattern,
        formIndex,
        fields: buildDefaultFieldConfigs(form),
        namedFills: [],
        autoSeed: false,
      };

      if (!formConfig) {
        nextConfig.namedFills.push(namedFill);
        await saveFormConfig(nextConfig);
      } else {
        await upsertNamedFill(formId, namedFill);
        const fillIdx = nextConfig.namedFills.findIndex(nf => nf.name === namedFill.name);
        if (fillIdx >= 0) {
          nextConfig.namedFills[fillIdx] = namedFill;
        } else {
          nextConfig.namedFills.push(namedFill);
        }
      }

      onConfigUpdated(nextConfig);
      close();
    }),
  );

  if (formConfig) {
    menu.appendChild(
      createMenuButton('🌱 Fill Seeded', () => { fillFormRandom(form, formConfig); close(); }),
    );
  }

  menu.appendChild(createSeparator());
  
  const namedFills = formConfig?.namedFills ?? [];

  if (namedFills.length === 0) {
    menu.appendChild(createMenuLabel('No saved named fills'));
  } else {
    menu.appendChild(createMenuLabel('Fill named fill'));
    // menu.appendChild(createSeparator());
    namedFills.forEach(fill => {
      menu.appendChild(
        createMenuButton(`• ${fill.name}`, () => {
          fillFormWithValues(form, fill.values);
          close();
        }),
      );
    });
  }

  return menu;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Inject the seeder button into a form (idempotent). */
export function injectOverlay(
  form: HTMLFormElement,
  formConfig: FormConfig | null,
  formId: string,
  formIndex: number,
  urlPattern: string,
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

    menu = buildMenu(
      form,
      currentConfig,
      formId,
      formIndex,
      urlPattern,
      (nextConfig) => {
        currentConfig = nextConfig;
      },
      () => { menu = null; },
    );
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
