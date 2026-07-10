/**
 * Random value generators keyed by HTML input type (or override type).
 * All generator functions are pure and stateless.
 */

import { FieldConfig, NumberFieldConfig, TextFieldConfig } from '../types/config';

// ─── Word / name lists ────────────────────────────────────────────────────────

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur',
  'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor',
  'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua',
];

const FIRST_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
const LAST_NAMES  = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const DOMAINS     = ['example.com', 'test.org', 'demo.net', 'sample.io'];

// ─── Primitive helpers ────────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Type-specific generators ─────────────────────────────────────────────────

function generateText(cfg?: TextFieldConfig): string {
  if (cfg?.predefinedValues?.length) return randomFrom(cfg.predefinedValues);
  return Array.from({ length: randomInt(2, 5) }, () => randomFrom(LOREM_WORDS)).join(' ');
}

function generateLongText(cfg?: TextFieldConfig): string {
  if (cfg?.predefinedValues?.length) return randomFrom(cfg.predefinedValues);
  return Array.from({ length: randomInt(2, 4) }, () => {
    const words = Array.from({ length: randomInt(5, 10) }, () => randomFrom(LOREM_WORDS));
    words[0] = words[0][0].toUpperCase() + words[0].slice(1);
    return words.join(' ') + '.';
  }).join(' ');
}

function generateNumber(cfg?: NumberFieldConfig): number {
  const min          = cfg?.min          ?? 0;
  const max          = cfg?.max          ?? 100;
  const decimals     = cfg?.decimals     ?? 0;
  const excludeValues = cfg?.excludeValues ?? [];

  for (let i = 0; i < 100; i++) {
    const raw   = Math.random() * (max - min) + min;
    const value = decimals > 0 ? parseFloat(raw.toFixed(decimals)) : Math.floor(raw);
    if (!excludeValues.includes(value)) return value;
  }
  return min;
}

function generateEmail(): string {
  const first  = randomFrom(FIRST_NAMES).toLowerCase();
  const last   = randomFrom(LAST_NAMES).toLowerCase();
  const domain = randomFrom(DOMAINS);
  return `${first}.${last}@${domain}`;
}

function generatePhone(): string {
  return `+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`;
}

function generateUrl(): string {
  return `https://${randomFrom(DOMAINS)}/${randomFrom(LOREM_WORDS)}`;
}

function generateDate(): string {
  const y = randomInt(2000, 2030);
  const m = String(randomInt(1, 12)).padStart(2, '0');
  const d = String(randomInt(1, 28)).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generateDateTimeLocal(): string {
  const h = String(randomInt(0, 23)).padStart(2, '0');
  const min = String(randomInt(0, 59)).padStart(2, '0');
  return `${generateDate()}T${h}:${min}`;
}

function generateTime(): string {
  return `${String(randomInt(0, 23)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}`;
}

function generateMonth(): string {
  return `${randomInt(2020, 2030)}-${String(randomInt(1, 12)).padStart(2, '0')}`;
}

function generateWeek(): string {
  return `${randomInt(2020, 2030)}-W${String(randomInt(1, 52)).padStart(2, '0')}`;
}

function generateColor(): string {
  return '#' + [0, 0, 0].map(() => randomInt(0, 255).toString(16).padStart(2, '0')).join('');
}

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  return Array.from({ length: randomInt(10, 16) }, () => chars[randomInt(0, chars.length - 1)]).join('');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a random value string for the given input type, optionally
 * constrained by a FieldConfig (type override + type-specific config).
 */
export function generateValueForField(inputType: string, fieldConfig?: FieldConfig): string {
  const effective = fieldConfig?.overrideType ?? inputType;

  switch (effective) {
    case 'number':
    case 'range':
      return String(generateNumber(fieldConfig?.numberConfig));
    case 'email':
      return generateEmail();
    case 'tel':
    case 'phone':
      return generatePhone();
    case 'url':
      return generateUrl();
    case 'date':
      return generateDate();
    case 'datetime-local':
      return generateDateTimeLocal();
    case 'time':
      return generateTime();
    case 'month':
      return generateMonth();
    case 'week':
      return generateWeek();
    case 'color':
      return generateColor();
    case 'boolean':
    case 'checkbox':
      return Math.random() > 0.5 ? 'true' : 'false';
    case 'password':
      return generatePassword();
    case 'textarea':
      return generateLongText(fieldConfig?.textConfig);
    default:
      return generateText(fieldConfig?.textConfig);
  }
}
