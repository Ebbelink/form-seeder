/**
 * Form filling logic – fills form elements with provided or generated values,
 * and reads back the current values from a form.
 */

import { FormConfig } from '../types/config';
import { generateValueForField } from '../utils/dataGenerator';
import { getFieldKey } from '../utils/formId';

type FormField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isInteractiveField(el: Element): el is FormField {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement
  );
}

const SKIP_INPUT_TYPES = new Set(['hidden', 'submit', 'reset', 'button', 'file', 'image']);

function dispatchChangeEvents(el: FormField): void {
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// ─── Radio-group helper ───────────────────────────────────────────────────────

function collectRadioGroups(form: HTMLFormElement): Record<string, HTMLInputElement[]> {
  const groups: Record<string, HTMLInputElement[]> = {};
  for (const el of Array.from(form.elements)) {
    if (el instanceof HTMLInputElement && el.type === 'radio') {
      (groups[el.name] ??= []).push(el);
    }
  }
  return groups;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fills every interactive element in the form with a randomly generated value,
 * optionally constrained by a stored FormConfig.
 */
export function fillFormRandom(form: HTMLFormElement, formConfig?: FormConfig | null): void {
  const radioGroups = collectRadioGroups(form);
  const elements    = Array.from(form.elements);

  elements.forEach((el, idx) => {
    if (!isInteractiveField(el)) return;

    const key        = getFieldKey(el, idx);
    const fieldConfig = formConfig?.fields.find(f => f.inputName === key);

    if (el instanceof HTMLInputElement) {
      const type = el.type.toLowerCase();
      if (SKIP_INPUT_TYPES.has(type) || type === 'radio') return;

      if (type === 'checkbox') {
        el.checked = generateValueForField('checkbox', fieldConfig) === 'true';
      } else {
        el.value = generateValueForField(type, fieldConfig);
      }
      dispatchChangeEvents(el);

    } else if (el instanceof HTMLSelectElement) {
      const options = Array.from(el.options).filter(o => o.value !== '');
      if (options.length > 0) {
        el.value = options[Math.floor(Math.random() * options.length)].value;
        dispatchChangeEvents(el);
      }

    } else if (el instanceof HTMLTextAreaElement) {
      el.value = generateValueForField('textarea', fieldConfig);
      dispatchChangeEvents(el);
    }
  });

  // Select one radio per group
  for (const radios of Object.values(radioGroups)) {
    const pick = radios[Math.floor(Math.random() * radios.length)];
    pick.checked = true;
    dispatchChangeEvents(pick);
  }
}

/**
 * Fills form fields from a saved values map (named fill or seeded fill).
 */
export function fillFormWithValues(
  form: HTMLFormElement,
  values: Record<string, string>,
): void {
  const elements = Array.from(form.elements);

  elements.forEach((el, idx) => {
    if (!isInteractiveField(el)) return;

    const key   = getFieldKey(el, idx);
    const value = values[key];
    if (value === undefined) return;

    if (el instanceof HTMLInputElement) {
      if (el.type === 'checkbox') {
        el.checked = value === 'true';
      } else if (el.type === 'radio') {
        el.checked = el.value === value;
      } else {
        el.value = value;
      }
    } else if (el instanceof HTMLSelectElement) {
      el.value = value;
    } else if (el instanceof HTMLTextAreaElement) {
      el.value = value;
    }
    dispatchChangeEvents(el);
  });
}

/**
 * Reads the current values of all interactive fields in the form.
 */
export function getCurrentFormValues(form: HTMLFormElement): Record<string, string> {
  const values: Record<string, string> = {};
  const elements = Array.from(form.elements);

  elements.forEach((el, idx) => {
    if (!isInteractiveField(el)) return;

    const key = getFieldKey(el, idx);

    if (el instanceof HTMLInputElement) {
      const type = el.type.toLowerCase();
      if (SKIP_INPUT_TYPES.has(type)) return;
      if (type === 'checkbox') {
        values[key] = el.checked ? 'true' : 'false';
      } else if (type === 'radio') {
        if (el.checked) values[key] = el.value;
      } else {
        values[key] = el.value;
      }
    } else if (el instanceof HTMLSelectElement) {
      values[key] = el.value;
    } else if (el instanceof HTMLTextAreaElement) {
      values[key] = el.value;
    }
  });

  return values;
}
