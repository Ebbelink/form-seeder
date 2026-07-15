/**
 * Message types for communication between popup ↔ content script.
 */

import { FormConfig } from './config';

export interface FormFieldInfo {
  name: string;
  type: string;
}

export interface FormInfo {
  id: string;
  index: number;
  name: string;
  fieldCount: number;
  fields: FormFieldInfo[];
  config: FormConfig | null;
}

export type FillMethod = 'random' | 'seeded' | 'named';

export type MessageRequest =
  | { type: 'GET_FORMS' }
  | { type: 'FILL_FORM'; formIndex: number; method: FillMethod; namedFillName?: string }
  | { type: 'GET_FORM_VALUES'; formIndex: number };

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
