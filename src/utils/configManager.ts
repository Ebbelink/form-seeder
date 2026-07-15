/**
 * Thin wrapper around chrome.storage.local for persisting the extension config.
 * All functions are async and reject on chrome.runtime.lastError.
 */

import { ExtensionConfig, FormConfig, NamedFill } from '../types/config';

const STORAGE_KEY = 'formSeederConfig';

const DEFAULT_CONFIG: ExtensionConfig = {
  version: '1.0.0',
  forms: [],
};

// ─── Low-level storage helpers ────────────────────────────────────────────────

export function loadConfig(): Promise<ExtensionConfig> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve((result[STORAGE_KEY] as ExtensionConfig) ?? DEFAULT_CONFIG);
    });
  });
}

export function saveConfig(config: ExtensionConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEY]: config }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

// ─── Domain-level helpers ─────────────────────────────────────────────────────

export async function getFormConfig(formId: string): Promise<FormConfig | null> {
  const config = await loadConfig();
  return config.forms.find(f => f.id === formId) ?? null;
}

export async function saveFormConfig(formConfig: FormConfig): Promise<void> {
  const config = await loadConfig();
  const idx = config.forms.findIndex(f => f.id === formConfig.id);
  if (idx >= 0) {
    config.forms[idx] = formConfig;
  } else {
    config.forms.push(formConfig);
  }
  await saveConfig(config);
}

export async function upsertNamedFill(formId: string, namedFill: NamedFill): Promise<void> {
  const config = await loadConfig();
  const form = config.forms.find(f => f.id === formId);
  if (!form) return;
  const idx = form.namedFills.findIndex(nf => nf.name === namedFill.name);
  if (idx >= 0) {
    form.namedFills[idx] = namedFill;
  } else {
    form.namedFills.push(namedFill);
  }
  await saveConfig(config);
}

export async function deleteNamedFill(formId: string, fillName: string): Promise<void> {
  const config = await loadConfig();
  const form = config.forms.find(f => f.id === formId);
  if (!form) return;
  form.namedFills = form.namedFills.filter(nf => nf.name !== fillName);
  await saveConfig(config);
}

export async function exportConfigJson(): Promise<string> {
  const config = await loadConfig();
  return JSON.stringify(config, null, 2);
}

export async function importConfigJson(json: string): Promise<void> {
  const parsed = JSON.parse(json) as ExtensionConfig;
  if (!parsed.version || !Array.isArray(parsed.forms)) {
    throw new Error('Invalid config format');
  }
  await saveConfig(parsed);
}
