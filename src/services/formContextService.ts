/**
 * Service for deriving a stable form context (fields + identifier) from a form element.
 */

import { generateFormId, getFieldKey } from '../utils/formId';

export interface InteractiveFieldDescriptor {
  el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  key: string;
  type: string;
}

export interface FormContext {
  urlKey: string;
  fields: InteractiveFieldDescriptor[];
  tokens: string[];
  formId: string;
}

const SKIP_INPUT_TYPES = new Set(['hidden', 'submit', 'reset', 'button', 'file', 'image']);

export function getInteractiveFieldsForForm(form: HTMLFormElement): InteractiveFieldDescriptor[] {
  return Array.from(form.elements)
    .filter(el =>
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement,
    )
    .map((el, idx) => {
      const field = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const key = getFieldKey(field, idx);
      const type = field instanceof HTMLInputElement
        ? field.type.toLowerCase()
        : field.tagName.toLowerCase();
      return { el: field, key, type };
    })
    .filter(({ type }) => !SKIP_INPUT_TYPES.has(type));
}

export function buildFormContext(form: HTMLFormElement, formIndex: number): FormContext {
  const urlKey = window.location.hostname + window.location.pathname;
  const fields = getInteractiveFieldsForForm(form);
  const tokens = fields.map(f => `${f.key}:${f.type}`);
  const formId = generateFormId(urlKey, formIndex, tokens);

  return { urlKey, fields, tokens, formId };
}
