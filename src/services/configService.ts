/**
 * Service layer over config persistence helpers.
 */

import { FormConfig } from '../types/config';
import {
    deleteNamedFill,
    exportConfigJson,
    getFormConfig,
    importConfigJson,
    saveFormConfig,
} from '../utils/configManager';

export function getFormConfigById(formId: string): Promise<FormConfig | null> {
  return getFormConfig(formId);
}

export function saveFormConfiguration(formConfig: FormConfig): Promise<void> {
  return saveFormConfig(formConfig);
}

export function deleteNamedFillFromForm(formId: string, fillName: string): Promise<void> {
  return deleteNamedFill(formId, fillName);
}

export function exportConfigurationJson(): Promise<string> {
  return exportConfigJson();
}

export function importConfigurationJson(json: string): Promise<void> {
  return importConfigJson(json);
}
