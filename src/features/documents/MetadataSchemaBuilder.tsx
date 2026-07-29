/**
 * MetadataSchemaBuilder
 *
 * A visual field-by-field editor for a document type's metadata schema.
 * Allows admins to define what extra information must/can be captured
 * alongside a document upload (e.g. invoice number, expiry date, amount).
 *
 * The schema is serialized to/from a JSON string (metadataSchema field on DocumentType)
 * that maps to the metadata_schema_j JSONB column in the database.
 *
 * Schema format:
 *   { "fields": [{ "key", "label", "type", "required", "options?" }] }
 */
import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { type MetadataField, type MetadataSchema, parseMetadataSchema } from './types';

interface MetadataSchemaBuilderProps {
  /** Raw JSON string from DocumentType.metadataSchema */
  value?: string;
  /** Called with a new JSON string whenever the schema changes */
  onChange: (json: string) => void;
}

const FIELD_TYPES: { value: MetadataField['type']; label: string }[] = [
  { value: 'text',   label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date',   label: 'Date' },
  { value: 'select', label: 'Select (dropdown)' },
];

const EMPTY_FIELD: MetadataField = {
  key: '',
  label: '',
  type: 'text',
  required: false,
};

export default function MetadataSchemaBuilder({ value, onChange }: MetadataSchemaBuilderProps) {
  const schema: MetadataSchema = parseMetadataSchema(value);

  /** Write the updated field list back as a JSON string */
  const commit = (fields: MetadataField[]) => {
    onChange(JSON.stringify({ fields }));
  };

  const addField = () => {
    commit([...schema.fields, { ...EMPTY_FIELD }]);
  };

  const removeField = (idx: number) => {
    commit(schema.fields.filter((_, i) => i !== idx));
  };

  const updateField = (idx: number, patch: Partial<MetadataField>) => {
    commit(schema.fields.map((f, i) => i === idx ? { ...f, ...patch } : f));
  };

  /** Move a field one position up */
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const arr = [...schema.fields];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    commit(arr);
  };

  /** Move a field one position down */
  const moveDown = (idx: number) => {
    if (idx === schema.fields.length - 1) return;
    const arr = [...schema.fields];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    commit(arr);
  };

  return (
    <div className="space-y-3">
      {schema.fields.length === 0 ? (
        <div className="text-center py-6 bg-canvas-subtle/40 border border-dashed border-canvas-active rounded-xl text-ink-tertiary text-sm">
          No metadata fields defined.
          <br />
          <span className="text-xs">Click "Add Field" to require extra info during document upload.</span>
        </div>
      ) : (
        <div className="space-y-2">
          {schema.fields.map((field, idx) => (
            <FieldRow
              key={idx}
              field={field}
              isFirst={idx === 0}
              isLast={idx === schema.fields.length - 1}
              onChange={(patch) => updateField(idx, patch)}
              onRemove={() => removeField(idx)}
              onMoveUp={() => moveUp(idx)}
              onMoveDown={() => moveDown(idx)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addField}
        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 border border-dashed border-brand-300 rounded-lg transition-colors w-full justify-center"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Field
      </button>
    </div>
  );
}

// ─── Individual Field Row ─────────────────────────────────────────────────────

interface FieldRowProps {
  field: MetadataField;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<MetadataField>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function FieldRow({ field, isFirst, isLast, onChange, onRemove, onMoveUp, onMoveDown }: FieldRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [optionsText, setOptionsText] = useState((field.options ?? []).join(', '));

  const handleOptionsBlur = () => {
    const opts = optionsText.split(',').map(s => s.trim()).filter(Boolean);
    onChange({ options: opts.length > 0 ? opts : undefined });
  };

  return (
    <div className="border border-canvas-active rounded-xl bg-canvas overflow-hidden">
      {/* Compact header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle / reorder buttons */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-0.5 text-neutral-300 hover:text-neutral-500 disabled:opacity-20 transition-colors"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-0.5 text-neutral-300 hover:text-neutral-500 disabled:opacity-20 transition-colors"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Key input */}
        <input
          type="text"
          placeholder="fieldKey (camelCase)"
          value={field.key}
          onChange={e => onChange({ key: e.target.value.replace(/\s+/g, '') })}
          className="flex-1 px-2.5 py-1.5 text-xs font-mono rounded-md border border-canvas-active bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 min-w-0"
        />

        {/* Type select */}
        <select
          value={field.type}
          onChange={e => onChange({ type: e.target.value as MetadataField['type'] })}
          className="px-2 py-1.5 text-xs rounded-md border border-canvas-active bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
        >
          {FIELD_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Required toggle */}
        <label className="flex items-center gap-1.5 text-xs text-ink-secondary cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={field.required}
            onChange={e => onChange({ required: e.target.checked })}
            className="w-3.5 h-3.5 text-brand-500 rounded border-neutral-300 focus:ring-brand-500"
          />
          Required
        </label>

        {/* Expand / collapse for label & options */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 text-neutral-400 hover:text-brand-500 rounded-md transition-colors shrink-0"
          title="Edit label / options"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Remove */}
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-neutral-300 hover:text-status-error rounded-md transition-colors shrink-0"
          title="Remove field"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded detail section */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-canvas-subtle/40 border-t border-canvas-subtle space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-ink-tertiary uppercase tracking-wider mb-1">Display Label</label>
            <input
              type="text"
              placeholder="e.g. Invoice Number"
              value={field.label}
              onChange={e => onChange({ label: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-canvas-active bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {field.type === 'select' && (
            <div>
              <label className="block text-[10px] font-bold text-ink-tertiary uppercase tracking-wider mb-1">
                Options <span className="text-neutral-400 normal-case font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Approved, Pending, Rejected"
                value={optionsText}
                onChange={e => setOptionsText(e.target.value)}
                onBlur={handleOptionsBlur}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md border border-canvas-active bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
              {field.options && field.options.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {field.options.map(opt => (
                    <span key={opt} className="px-2 py-0.5 rounded bg-brand-50 text-brand-700 text-[10px] font-medium border border-brand-100">
                      {opt}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
