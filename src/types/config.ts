/**
 * Core domain types for the Form Seeder extension configuration.
 */

export type PrimitiveOverride =
  | 'text'
  | 'number'
  | 'email'
  | 'phone'
  | 'url'
  | 'date'
  | 'datetime-local'
  | 'time'
  | 'month'
  | 'week'
  | 'color'
  | 'boolean'
  | 'password';

export interface NumberFieldConfig {
  min: number;
  max: number;
  decimals: number;
  excludeValues: number[];
}

export interface TextFieldConfig {
  predefinedValues: string[];
}

export interface FieldConfig {
  /** Stable key derived from name, id or positional index. */
  inputName: string;
  /** The original HTML input type (or 'select', 'textarea'). */
  inputType: string;
  /** If set, overrides the input type used when generating values. */
  overrideType?: PrimitiveOverride;
  numberConfig?: NumberFieldConfig;
  textConfig?: TextFieldConfig;
}

export interface NamedFill {
  name: string;
  /** Maps each field's inputName to the saved value string. */
  values: Record<string, string>;
}

export interface FormConfig {
  /** Stable ID derived from URL + form structure hash. */
  id: string;
  /** hostname + pathname of the page where the form lives. */
  urlPattern: string;
  /** Zero-based index of the form on the page (used as tiebreaker). */
  formIndex: number;
  fields: FieldConfig[];
  namedFills: NamedFill[];
  /** When true the form is auto-filled on page load. */
  autoSeed: boolean;
}

export interface ExtensionConfig {
  version: string;
  forms: FormConfig[];
}
