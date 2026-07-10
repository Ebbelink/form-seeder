/**
 * Domain service for creating/updating named fills while keeping form config consistent.
 */

import { FieldConfig, FormConfig, NamedFill } from '../types/config';
import { saveFormConfig, upsertNamedFill } from '../utils/configManager';

export interface SaveNamedFillInput {
  formId: string;
  formIndex: number;
  urlPattern: string;
  currentConfig: FormConfig | null;
  defaultFields: FieldConfig[];
  fillName: string;
  values: Record<string, string>;
}

export async function saveNamedFill(input: SaveNamedFillInput): Promise<FormConfig> {
  const {
    formId,
    formIndex,
    urlPattern,
    currentConfig,
    defaultFields,
    fillName,
    values,
  } = input;

  const trimmedName = fillName.trim();
  const namedFill: NamedFill = { name: trimmedName, values };

  const nextConfig: FormConfig = currentConfig ?? {
    id: formId,
    urlPattern,
    formIndex,
    fields: defaultFields,
    namedFills: [],
    autoSeed: false,
  };

  if (!currentConfig) {
    nextConfig.namedFills.push(namedFill);
    await saveFormConfig(nextConfig);
    return nextConfig;
  }

  await upsertNamedFill(formId, namedFill);

  const fillIdx = nextConfig.namedFills.findIndex(nf => nf.name === trimmedName);
  if (fillIdx >= 0) {
    nextConfig.namedFills[fillIdx] = namedFill;
  } else {
    nextConfig.namedFills.push(namedFill);
  }

  return nextConfig;
}
