/**
 * Content script entry point.
 *
 * Responsibilities:
 * - Detect all forms on the page and inject the Form Seeder overlay button.
 * - Auto-seed forms that have autoSeed enabled in their config.
 * - Respond to messages from the popup.
 * - Watch for dynamically added forms via MutationObserver.
 */

import { FormConfig } from '../types/config';
import { FormFieldInfo, FormInfo, MessageRequest, MessageResponse } from '../types/messages';
import { getFormConfig } from '../utils/configManager';
import { generateFormId, getFieldKey } from '../utils/formId';
import { fillFormRandom, fillFormWithValues, getCurrentFormValues } from './formFiller';
import { injectOverlay } from './formOverlay';

// ─── Form introspection ───────────────────────────────────────────────────────

function getInteractiveFields(
  form: HTMLFormElement,
): Array<{ el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement; key: string; type: string }> {
  const SKIP = new Set(['hidden', 'submit', 'reset', 'button', 'file', 'image']);
  return Array.from(form.elements)
    .filter(el =>
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement,
    )
    .map((el, idx) => {
      const field = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const key   = getFieldKey(field, idx);
      const type  = field instanceof HTMLInputElement
        ? field.type.toLowerCase()
        : field.tagName.toLowerCase();
      return { el: field, key, type };
    })
    .filter(({ type }) => !SKIP.has(type));
}

function buildFormInfo(form: HTMLFormElement, index: number, config: FormConfig | null): FormInfo {
  const urlKey = window.location.hostname + window.location.pathname;
  const fields = getInteractiveFields(form);
  const tokens = fields.map(f => `${f.key}:${f.type}`);
  const id     = generateFormId(urlKey, index, tokens);
  const name   = form.id || form.name || `Form ${index + 1}`;

  const fieldInfos: FormFieldInfo[] = fields.map(f => ({ name: f.key, type: f.type }));

  return { id, index, name, fieldCount: fields.length, fields: fieldInfos, config };
}

// ─── Processing ───────────────────────────────────────────────────────────────

async function processForm(form: HTMLFormElement, index: number): Promise<void> {
  const urlKey  = window.location.hostname + window.location.pathname;
  const fields  = getInteractiveFields(form);
  const tokens  = fields.map(f => `${f.key}:${f.type}`);
  const formId  = generateFormId(urlKey, index, tokens);
  const config  = await getFormConfig(formId);

  injectOverlay(form, config, formId, index, urlKey);

  if (config?.autoSeed) {
    fillFormRandom(form, config);
  }
}

async function processAllForms(): Promise<void> {
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form'));
  await Promise.all(forms.map((form, i) => processForm(form, i)));
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (request: MessageRequest, _sender, sendResponse: (r: MessageResponse) => void) => {
    (async () => {
      try {
        switch (request.type) {
          case 'GET_FORMS': {
            const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form'));
            const infos = await Promise.all(
              forms.map(async (form, i) => {
                const urlKey  = window.location.hostname + window.location.pathname;
                const fields  = getInteractiveFields(form);
                const tokens  = fields.map(f => `${f.key}:${f.type}`);
                const formId  = generateFormId(urlKey, i, tokens);
                const config  = await getFormConfig(formId);
                return buildFormInfo(form, i, config);
              }),
            );
            sendResponse({ success: true, data: infos });
            break;
          }

          case 'FILL_FORM': {
            const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form'));
            const form  = forms[request.formIndex];
            if (!form) { sendResponse({ success: false, error: 'Form not found' }); return; }

            const urlKey = window.location.hostname + window.location.pathname;
            const fields = getInteractiveFields(form);
            const tokens = fields.map(f => `${f.key}:${f.type}`);
            const formId = generateFormId(urlKey, request.formIndex, tokens);
            const config = await getFormConfig(formId);

            if (request.method === 'random' || request.method === 'seeded') {
              fillFormRandom(form, config);
            } else if (request.method === 'named' && request.namedFillName) {
              const fill = config?.namedFills.find(nf => nf.name === request.namedFillName);
              if (fill) fillFormWithValues(form, fill.values);
            }
            sendResponse({ success: true });
            break;
          }

          case 'GET_FORM_VALUES': {
            const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form'));
            const form  = forms[request.formIndex];
            if (!form) { sendResponse({ success: false, error: 'Form not found' }); return; }
            sendResponse({ success: true, data: getCurrentFormValues(form) });
            break;
          }

          default:
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (err) {
        sendResponse({ success: false, error: String(err) });
      }
    })();

    return true; // async response
  },
);

// ─── Initialisation ───────────────────────────────────────────────────────────

processAllForms();

// Debounced MutationObserver so rapidly-changing DOMs don't thrash
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

new MutationObserver(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(processAllForms, 500);
}).observe(document.body, { childList: true, subtree: true });
