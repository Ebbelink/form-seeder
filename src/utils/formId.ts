/**
 * Generates stable, deterministic identifiers for forms and their fields.
 */

type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * djb2-based hash – fast, collision-resistant enough for form fingerprinting.
 */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash | 0; // keep 32-bit
  }
  return Math.abs(hash).toString(16);
}

/**
 * Returns a stable key for a form field based on name → id → placeholder → position.
 */
export function getFieldKey(
  input: FormElement,
  index: number,
): string {
  if (input.name)  return input.name;
  if (input.id)    return input.id;
  if (input instanceof HTMLInputElement && input.placeholder) return input.placeholder;
  return `field_${index}`;
}

/**
 * Returns a stable ID string for a form on a given page.
 *
 * @param urlKey        - hostname + pathname
 * @param formIndex     - zero-based position of the form on the page
 * @param fieldTokens   - array of "fieldKey:type" strings for every interactive field
 */
export function generateFormId(
  urlKey: string,
  formIndex: number,
  fieldTokens: string[],
): string {
  const fingerprint = `${urlKey}|${formIndex}|${fieldTokens.join(',')}`;
  return `fs_${djb2Hash(fingerprint)}`;
}
