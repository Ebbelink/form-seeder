/**
 * Content script entry point.
 *
 * Responsibilities:
 * - Detect all forms on the page and inject the Form Seeder overlay button.
 * - Auto-seed forms that have autoSeed enabled in their config.
 * - Respond to messages from the popup.
 * - Watch for dynamically added forms via MutationObserver.
 */

import { getFormConfigById } from '../services/configService';
import { buildFormContext } from '../services/formContextService';
import { FormConfig } from '../types/config';
import { FormFieldInfo, FormInfo, MessageRequest, MessageResponse } from '../types/messages';
import { fillFormRandom, fillFormWithValues, getCurrentFormValues } from './formFiller';
import { injectOverlay, removeOverlay } from './formOverlay';

// ─── Form introspection ───────────────────────────────────────────────────────

function buildFormInfo(form: HTMLFormElement, index: number, config: FormConfig | null): FormInfo {
  const context = buildFormContext(form, index);
  const name   = form.id || form.name || `Form ${index + 1}`;

  const fieldInfos: FormFieldInfo[] = context.fields.map(f => ({ name: f.key, type: f.type }));

  return { id: context.formId, index, name, fieldCount: context.fields.length, fields: fieldInfos, config };
}

// ─── Processing ───────────────────────────────────────────────────────────────

async function processForm(form: HTMLFormElement, index: number): Promise<void> {
  const context = buildFormContext(form, index);

  if (context.fields.length === 0) {
    removeOverlay(form);
    return;
  }

  const config  = await getFormConfigById(context.formId);

  injectOverlay(form, config, context.formId, index, context.urlKey);

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
                const context = buildFormContext(form, i);
                const config  = await getFormConfigById(context.formId);
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

            const context = buildFormContext(form, request.formIndex);
            const config = await getFormConfigById(context.formId);

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
