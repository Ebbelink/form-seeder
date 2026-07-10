/**
 * Popup script – orchestrates the Form Seeder UI.
 *
 * Architecture:
 *   Popup ──(chrome.tabs.sendMessage)──► Content script  (fill / read forms)
 *   Popup ──(chrome.storage.local)────► Config manager   (persist / load config)
 */

import {
  loadConfig,
  saveFormConfig,
  upsertNamedFill,
  deleteNamedFill,
  exportConfigJson,
  importConfigJson,
} from '../utils/configManager';
import {
  ExtensionConfig,
  FormConfig,
  FieldConfig,
  NumberFieldConfig,
  TextFieldConfig,
  PrimitiveOverride,
} from '../types/config';
import { FormInfo, MessageRequest, MessageResponse } from '../types/messages';

// ─── State ────────────────────────────────────────────────────────────────────

let activeTabId: number | null = null;
let forms: FormInfo[]          = [];

// ─── Chrome messaging helpers ─────────────────────────────────────────────────

async function sendToContent<T>(message: MessageRequest): Promise<MessageResponse<T>> {
  if (!activeTabId) throw new Error('No active tab');
  return chrome.tabs.sendMessage(activeTabId, message) as Promise<MessageResponse<T>>;
}

// ─── UI state helpers ─────────────────────────────────────────────────────────

function showState(id: 'stateLoading' | 'stateNoForms' | 'stateError' | 'formsList', msg?: string): void {
  for (const el of ['stateLoading', 'stateNoForms', 'stateError', 'formsList'] as const) {
    (document.getElementById(el) as HTMLElement).hidden = el !== id;
  }
  if (id === 'stateError' && msg) {
    (document.getElementById('stateError') as HTMLElement).textContent = msg;
  }
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (string | Node)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function btn(label: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', { className: `btn ${cls}` }, label);
  b.addEventListener('click', onClick);
  return b;
}

// ─── Config panel ─────────────────────────────────────────────────────────────

const OVERRIDE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '',              label: 'Auto' },
  { value: 'text',         label: 'Text' },
  { value: 'number',       label: 'Number' },
  { value: 'email',        label: 'Email' },
  { value: 'phone',        label: 'Phone' },
  { value: 'url',          label: 'URL' },
  { value: 'date',         label: 'Date' },
  { value: 'datetime-local', label: 'Date-Time' },
  { value: 'time',         label: 'Time' },
  { value: 'color',        label: 'Color' },
  { value: 'boolean',      label: 'Boolean' },
  { value: 'password',     label: 'Password' },
];

function buildFieldRow(field: FormInfo['fields'][number], existing?: FieldConfig): HTMLDivElement {
  const existing_  = existing ?? { inputName: field.name, inputType: field.type };
  const row        = el('div', { className: 'field-row' });
  const top        = el('div', { className: 'field-top' });
  const nameLbl    = el('span', { className: 'field-name' }, field.name);
  const typeBadge  = el('span', { className: 'field-type-badge' }, field.type);

  const select = el('select', { className: 'field-select' });
  for (const opt of OVERRIDE_OPTIONS) {
    const o = el('option', { value: opt.value }, opt.label);
    if ((existing_.overrideType ?? '') === opt.value) o.selected = true;
    select.appendChild(o);
  }

  top.append(nameLbl, typeBadge, select);
  row.append(top);

  // Type-specific config panels (shown/hidden based on override selection)
  const numberCfg = buildNumberConfig(existing_.numberConfig);
  const textCfg   = buildTextConfig(existing_.textConfig);

  function refresh(): void {
    const v = select.value as PrimitiveOverride | '';
    const isNum  = v === 'number' || (v === '' && (field.type === 'number' || field.type === 'range'));
    const isText = v === 'text'   || (v === '' && (field.type === 'text' || field.type === 'textarea' || field.type === 'search'));
    numberCfg.hidden = !isNum;
    textCfg.hidden   = !isText;
  }
  select.addEventListener('change', refresh);
  refresh();

  row.append(numberCfg, textCfg);
  return row;
}

function buildNumberConfig(existing?: NumberFieldConfig): HTMLDivElement {
  const wrap = el('div', { className: 'type-config', 'data-config-type': 'number' });

  const row1 = el('div', { className: 'type-config-row' });
  const minI = el('input', { className: 'input-sm', type: 'number', placeholder: 'Min', 'data-nc': 'min' });
  const maxI = el('input', { className: 'input-sm', type: 'number', placeholder: 'Max', 'data-nc': 'max' });
  const decI = el('input', { className: 'input-sm', type: 'number', placeholder: 'Decimals', min: '0', 'data-nc': 'decimals' });
  if (existing) {
    (minI as HTMLInputElement).value = String(existing.min);
    (maxI as HTMLInputElement).value = String(existing.max);
    (decI as HTMLInputElement).value = String(existing.decimals);
  }

  const row2 = el('div', { className: 'type-config-row' });
  const excI = el('input', { className: 'input-sm wide', type: 'text', placeholder: 'Exclude values (comma-separated)', 'data-nc': 'exclude' });
  if (existing?.excludeValues?.length) (excI as HTMLInputElement).value = existing.excludeValues.join(', ');

  row1.append(minI, maxI, decI);
  row2.append(excI);
  wrap.append(row1, row2);
  return wrap;
}

function buildTextConfig(existing?: TextFieldConfig): HTMLDivElement {
  const wrap = el('div', { className: 'type-config', 'data-config-type': 'text' });
  const lbl  = el('span', { className: 'text-sm text-muted' }, 'Predefined values (one per line):');
  const ta   = el('textarea', { className: 'input-sm wide', rows: '3', 'data-tc': 'predefined', style: 'height:56px;resize:vertical' });
  if (existing?.predefinedValues?.length) (ta as HTMLTextAreaElement).value = existing.predefinedValues.join('\n');
  wrap.append(lbl, ta);
  return wrap;
}

function readFieldConfig(row: HTMLDivElement, field: FormInfo['fields'][number]): FieldConfig {
  const select       = row.querySelector<HTMLSelectElement>('.field-select')!;
  const overrideType = select.value as PrimitiveOverride | '';

  const cfg: FieldConfig = { inputName: field.name, inputType: field.type };
  if (overrideType) cfg.overrideType = overrideType;

  // Number config – only save when the panel is visible
  const numPanel = row.querySelector<HTMLDivElement>('[data-config-type="number"]');
  if (numPanel && !numPanel.hidden) {
    cfg.numberConfig = {
      min:           parseFloat(numPanel.querySelector<HTMLInputElement>('[data-nc="min"]')!.value) || 0,
      max:           parseFloat(numPanel.querySelector<HTMLInputElement>('[data-nc="max"]')!.value) || 100,
      decimals:      parseInt(numPanel.querySelector<HTMLInputElement>('[data-nc="decimals"]')!.value, 10) || 0,
      excludeValues: numPanel.querySelector<HTMLInputElement>('[data-nc="exclude"]')!.value
        .split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v)),
    };
  }

  // Text config – only save when the panel is visible and has values
  const txtPanel = row.querySelector<HTMLDivElement>('[data-config-type="text"]');
  if (txtPanel && !txtPanel.hidden) {
    const raw = txtPanel.querySelector<HTMLTextAreaElement>('[data-tc="predefined"]')!.value;
    const vals = raw.split('\n').map(v => v.trim()).filter(Boolean);
    if (vals.length > 0) cfg.textConfig = { predefinedValues: vals };
  }

  return cfg;
}

// ─── Named fills panel ────────────────────────────────────────────────────────

function buildNamedFillsPanel(formInfo: FormInfo, onUpdate: () => void): HTMLDivElement {
  const wrap   = el('div', { className: 'named-fills-config' });
  const title  = el('h4', {}, 'Named Fills');
  const list   = el('div', { className: '', 'data-nf-list': '' });
  wrap.append(title, list);

  function renderList(): void {
    list.innerHTML = '';
    const fills = formInfo.config?.namedFills ?? [];
    if (fills.length === 0) {
      list.append(el('div', { className: 'text-sm text-muted', style: 'margin-bottom:8px' }, 'No named fills yet.'));
      return;
    }
    for (const fill of fills) {
      const item   = el('div', { className: 'named-fill-item' });
      const name   = el('span', { className: 'named-fill-name' }, fill.name);
      const delBtn = btn('✕', 'btn-ghost', async () => {
        await deleteNamedFill(formInfo.id, fill.name);
        if (formInfo.config) {
          formInfo.config.namedFills = formInfo.config.namedFills.filter(nf => nf.name !== fill.name);
        }
        renderList();
        onUpdate();
      });
      item.append(name, delBtn);
      list.append(item);
    }
  }
  renderList();

  const saveBtn = btn('💾 Save Current Values as Named Fill', 'btn btn-secondary', async () => {
    const name = prompt('Enter a name for this fill:');
    if (!name?.trim()) return;
    try {
      const res = await sendToContent<Record<string, string>>({ type: 'GET_FORM_VALUES', formIndex: formInfo.index });
      if (!res.success || !res.data) { alert('Could not read form values.'); return; }
      await upsertNamedFill(formInfo.id, { name: name.trim(), values: res.data });
      if (!formInfo.config) {
        formInfo.config = {
          id: formInfo.id, urlPattern: location.href, formIndex: formInfo.index,
          fields: [], namedFills: [], autoSeed: false,
        };
      }
      const existIdx = formInfo.config.namedFills.findIndex(nf => nf.name === name.trim());
      const newFill  = { name: name.trim(), values: res.data };
      if (existIdx >= 0) formInfo.config.namedFills[existIdx] = newFill;
      else formInfo.config.namedFills.push(newFill);
      renderList();
      onUpdate();
    } catch {
      alert('Error saving fill. Is the extension active on this page?');
    }
  });
  saveBtn.style.marginTop = '6px';
  wrap.append(saveBtn);
  return wrap;
}

// ─── Form item rendering ──────────────────────────────────────────────────────

function renderFormItem(formInfo: FormInfo, onUpdate: () => void): HTMLDivElement {
  const item = el('div', { className: 'form-item' });

  // ── Header row ────────────────────────────────────────────────────────────
  const header  = el('div', { className: 'form-header' });
  const nameEl  = el('span', { className: 'form-name' }, formInfo.name);
  const metaEl  = el('span', { className: 'form-meta' }, `${formInfo.fieldCount} field${formInfo.fieldCount !== 1 ? 's' : ''}`);
  header.append(nameEl, metaEl);
  item.append(header);

  // ── Action buttons ────────────────────────────────────────────────────────
  const actionRow = el('div', { className: 'form-action-row' });
  const fillRndBtn = btn('🎲 Fill Random', 'btn-secondary', async () => {
    try {
      await sendToContent({ type: 'FILL_FORM', formIndex: formInfo.index, method: 'random' });
    } catch { alert('Could not fill form. Is the extension active on this page?'); }
  });

  const fillSeedBtn = btn('🌱 Fill Seeded', 'btn-secondary', async () => {
    try {
      await sendToContent({ type: 'FILL_FORM', formIndex: formInfo.index, method: 'seeded' });
    } catch { alert('Could not fill form.'); }
  });

  let configPanelVisible = false;
  const configBtn = btn('⚙ Configure', 'btn-secondary', () => {
    configPanelVisible = !configPanelVisible;
    configPanel.hidden = !configPanelVisible;
    configBtn.textContent = configPanelVisible ? '✕ Close' : '⚙ Configure';
  });

  actionRow.append(fillRndBtn);
  if (formInfo.config) actionRow.append(fillSeedBtn);
  actionRow.append(configBtn);
  item.append(actionRow);

  // ── Named fill tags ───────────────────────────────────────────────────────
  const namedFillsRow = el('div', { className: 'named-fills-row' });
  function renderNamedFillTags(): void {
    namedFillsRow.innerHTML = '';
    for (const fill of formInfo.config?.namedFills ?? []) {
      const tag = el('span', { className: 'tag-fill', title: `Fill with "${fill.name}"` }, `📋 ${fill.name}`);
      tag.addEventListener('click', async () => {
        try {
          await sendToContent({ type: 'FILL_FORM', formIndex: formInfo.index, method: 'named', namedFillName: fill.name });
        } catch { alert('Could not fill form.'); }
      });
      namedFillsRow.append(tag);
    }
  }
  renderNamedFillTags();
  if ((formInfo.config?.namedFills?.length ?? 0) > 0) item.append(namedFillsRow);

  // ── Config panel ──────────────────────────────────────────────────────────
  const configPanel = el('div', { className: 'config-panel' });
  configPanel.hidden = true;

  const panelTitle = el('h3', {}, 'Configuration');
  configPanel.append(panelTitle);

  // Auto-seed toggle
  const toggleRow = el('div', { className: 'toggle-row' });
  const autoSeedCb = el('input', { type: 'checkbox', id: `auto-${formInfo.id}` }) as HTMLInputElement;
  autoSeedCb.checked = formInfo.config?.autoSeed ?? false;
  const autoSeedLbl = el('label', { for: `auto-${formInfo.id}` }, '🌱 Auto-seed on page load');
  toggleRow.append(autoSeedCb, autoSeedLbl);
  configPanel.append(toggleRow);

  // Fields list
  const fieldsTitle = el('h3', {}, 'Fields');
  configPanel.append(fieldsTitle);
  const fieldsList = el('div', { className: 'fields-list' });
  const fieldRows: HTMLDivElement[] = formInfo.fields.map(f => {
    const existingFieldCfg = formInfo.config?.fields.find(fc => fc.inputName === f.name);
    const row = buildFieldRow(f, existingFieldCfg);
    fieldsList.append(row);
    return row;
  });
  configPanel.append(fieldsList);

  // Named fills panel
  const onFillUpdate = () => { renderNamedFillTags(); };
  configPanel.append(buildNamedFillsPanel(formInfo, onFillUpdate));

  // Save config button
  const saveRow = el('div', { className: 'save-row' });
  const saveBtn = btn('💾 Save Configuration', 'btn-primary', async () => {
    const newFieldConfigs = formInfo.fields.map((f, idx) => readFieldConfig(fieldRows[idx], f));
    const newFormConfig: FormConfig = {
      id:          formInfo.id,
      urlPattern:  location.href,
      formIndex:   formInfo.index,
      fields:      newFieldConfigs,
      namedFills:  formInfo.config?.namedFills ?? [],
      autoSeed:    autoSeedCb.checked,
    };
    try {
      await saveFormConfig(newFormConfig);
      formInfo.config = newFormConfig;
      // Show seeded button if not already
      if (!actionRow.contains(fillSeedBtn)) actionRow.insertBefore(fillSeedBtn, configBtn);
      saveBtn.textContent = '✓ Saved!';
      saveBtn.classList.replace('btn-primary', 'btn-success');
      setTimeout(() => {
        saveBtn.textContent = '💾 Save Configuration';
        saveBtn.classList.replace('btn-success', 'btn-primary');
      }, 2000);
      onUpdate();
    } catch {
      alert('Failed to save configuration.');
    }
  });
  saveRow.append(saveBtn);
  configPanel.append(saveRow);

  item.append(configPanel);
  return item;
}

// ─── Forms list ───────────────────────────────────────────────────────────────

function renderForms(): void {
  if (forms.length === 0) { showState('stateNoForms'); return; }

  const container = document.getElementById('formsList')!;
  container.innerHTML = '';

  for (const form of forms) {
    container.append(renderFormItem(form, () => {}));
  }
  showState('formsList');
}

// ─── Import / Export ──────────────────────────────────────────────────────────

async function handleExport(): Promise<void> {
  const json = await exportConfigJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'form-seeder-config.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImport(file: File): Promise<void> {
  const text = await file.text();
  await importConfigJson(text);
  alert('Config imported successfully! Reload the page to see changes.');
}

// ─── Initialisation ───────────────────────────────────────────────────────────

async function init(): Promise<void> {
  showState('stateLoading');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) { showState('stateError', 'No active tab found.'); return; }
  activeTabId = tab.id;

  try {
    const res = await sendToContent<FormInfo[]>({ type: 'GET_FORMS' });
    if (!res.success) throw new Error(res.error ?? 'Unknown error');
    forms = (res.data as FormInfo[]) ?? [];
    renderForms();
  } catch (err) {
    showState('stateError', 'Cannot access forms on this page.\n(Try refreshing the tab.)');
    console.error('[Form Seeder popup]', err);
  }

  // Export button
  document.getElementById('btnExport')!.addEventListener('click', handleExport);

  // Import button
  const importFile = document.getElementById('importFile') as HTMLInputElement;
  document.getElementById('btnImport')!.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', () => {
    if (importFile.files?.[0]) handleImport(importFile.files[0]).catch(console.error);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => {
    showState('stateError', String(err));
  });
});
