import React, { useState, useEffect } from 'react';
import { documentTypeApi } from './api';
import { type DocumentType } from './types';
import { FileText, Plus, Edit2, Trash2, Loader2, Server, FileSignature, Layers, Clock, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import DataGrid, { type Column } from '../../components/common/DataGrid';
import Modal from '../../components/common/Modal';
import MetadataSchemaBuilder from './MetadataSchemaBuilder';

export default function DocumentTypeManager() {
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<Partial<DocumentType> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const res = await documentTypeApi.getAll();
      setTypes(res.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch document types:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to load document types';
      toast.error(`Error loading types: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;

    try {
      setSaving(true);
      if (editingType.documentTypeId) {
        await documentTypeApi.update(editingType.documentTypeId, editingType);
        toast.success('Document type updated');
      } else {
        await documentTypeApi.create(editingType);
        toast.success('Document type created');
      }
      setEditingType(null);
      fetchTypes();
    } catch (err: any) {
      console.error('Failed to save document type:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save document type';
      toast.error(`Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document type? This action cannot be undone.')) return;

    try {
      await documentTypeApi.delete(id);
      toast.success('Document type deleted');
      fetchTypes();
    } catch (err: any) {
      console.error('Failed to delete document type:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete document type';
      toast.error(`Delete failed: ${msg}`);
    }
  };

  const openNewTypeForm = () => {
    setEditingType({
      code: '',
      label: '',
      entityType: '',
      cardinalityMode: 'SINGLETON',
      requiresSubcategory: false,
      hasExpiry: false,
      storageProvider: 'gcs',
      namingTemplate: '{entityId}_{documentType}_{yyyyMMdd}',
      active: true
    });
  };

  const columns: Column<DocumentType>[] = [
    {
      header: 'Code / Label',
      key: 'label',
      render: (type) => (
        <div>
          <div className="font-semibold text-ink-primary flex items-center gap-2">
            {type.label}
            {!type.active && <span className="px-2 py-0.5 rounded text-[10px] bg-status-error/10 text-status-error">INACTIVE</span>}
          </div>
          <div className="text-xs text-brand-500 font-mono mt-0.5">{type.code}</div>
        </div>
      )
    },
    {
      header: 'Entity Type',
      key: 'entityType',
      render: (type) => (
        <span className="px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-700 font-medium text-xs font-mono">
          {type.entityType}
        </span>
      )
    },
    {
      header: 'Cardinality',
      key: 'cardinalityMode',
      render: (type) => (
        <div className="flex flex-col gap-1 text-xs">
          <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-neutral-400" /> {type.cardinalityMode}</span>
          {type.requiresSubcategory && <span className="text-neutral-500 italic">+ Subcategory</span>}
        </div>
      )
    },
    {
      header: 'Storage Provider',
      key: 'storageProvider',
      render: (type) => (
        <div className="flex flex-col gap-1 text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <Server className="w-3.5 h-3.5 text-brand-500" />
            {type.storageProvider.toUpperCase()}
          </span>
          {type.hasExpiry && <span className="flex items-center gap-1.5 text-status-warning"><Clock className="w-3 h-3" /> Tracks Expiry</span>}
        </div>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (type) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setEditingType(type); }}
            className="p-2 text-neutral-400 hover:text-brand-500 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(type.documentTypeId); }}
            className="p-2 text-neutral-400 hover:text-status-error transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  if (loading && types.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas text-ink-primary p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold font-serif tracking-tight">Document Types</h1>
          <p className="text-sm text-ink-secondary mt-1">Manage global storage configurations and entity document routing.</p>
        </div>
        <button
          onClick={openNewTypeForm}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg shadow-sm hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">New Document Type</span>
        </button>
      </div>

      <div className="flex-1 bg-surface border border-canvas-subtle rounded-xl shadow-soft overflow-hidden flex flex-col">
        {types.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-ink-tertiary">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No document types configured.</p>
          </div>
        ) : (
          <DataGrid
            data={types}
            columns={columns}
            getRowId={(item) => item.documentTypeId}
            searchFields={['code', 'label', 'entityType']}
          />
        )}
      </div>

      {/* Editor Modal */}
      <Modal
        isOpen={!!editingType}
        onClose={() => setEditingType(null)}
        title={editingType?.documentTypeId ? 'Edit Document Type' : 'New Document Type'}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditingType(null)}
              className="px-4 py-2 text-sm font-medium text-ink-secondary hover:text-ink-primary hover:bg-canvas-active rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="documentTypeForm"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Configuration
            </button>
          </>
        }
      >
        {editingType && (
          <form id="documentTypeForm" onSubmit={handleSave} className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1.5">Code (Unique)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingType.documentTypeId}
                  value={editingType.code}
                  onChange={e => setEditingType({ ...editingType, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg border border-canvas-active bg-canvas focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50 font-mono text-sm"
                  placeholder="e.g. INVOICE"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1.5">Display Label</label>
                <input
                  type="text"
                  required
                  value={editingType.label}
                  onChange={e => setEditingType({ ...editingType, label: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-canvas-active bg-canvas focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                  placeholder="e.g. Tax Invoice"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1.5">Entity Type</label>
                <input
                  type="text"
                  required
                  value={editingType.entityType}
                  onChange={e => setEditingType({ ...editingType, entityType: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg border border-canvas-active bg-canvas focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-mono text-sm"
                  placeholder="e.g. ORDER"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1.5">Storage Provider</label>
                <select
                  value={editingType.storageProvider}
                  onChange={e => setEditingType({ ...editingType, storageProvider: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-canvas-active bg-canvas focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm font-medium"
                >
                  <option value="gcs">Google Cloud Storage (gcs)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-secondary mb-1.5">Cardinality Mode</label>
              <select
                value={editingType.cardinalityMode}
                onChange={e => setEditingType({ ...editingType, cardinalityMode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-canvas-active bg-canvas focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm font-medium"
              >
                <option value="SINGLETON">SINGLETON (One active doc per entity)</option>
                <option value="MULTI">MULTI (Many docs per entity)</option>
                <option value="SINGLETON_PER_SUBCATEGORY">SINGLETON_PER_SUBCATEGORY (One doc per subcategory)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-secondary mb-1.5">Naming Template</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileSignature className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  type="text"
                  required
                  value={editingType.namingTemplate}
                  onChange={e => setEditingType({ ...editingType, namingTemplate: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-canvas-active bg-canvas focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-mono text-xs"
                />
              </div>
              <p className="text-[10px] text-neutral-500 mt-1.5">Available variables: {'{entityId}'}, {'{entityType}'}, {'{documentType}'}, {'{yyyyMMdd}'}, and any custom metadata {'{keys}'}</p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 p-3 border border-canvas-active rounded-lg hover:bg-canvas-subtle cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={editingType.requiresSubcategory}
                  onChange={e => setEditingType({ ...editingType, requiresSubcategory: e.target.checked })}
                  className="w-4 h-4 text-brand-500 rounded border-neutral-300 focus:ring-brand-500"
                />
                <div>
                  <div className="text-sm font-medium">Requires Subcategory</div>
                  <div className="text-xs text-neutral-500">Enforces subCategory_c presence during upload</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-canvas-active rounded-lg hover:bg-canvas-subtle cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={editingType.hasExpiry}
                  onChange={e => setEditingType({ ...editingType, hasExpiry: e.target.checked })}
                  className="w-4 h-4 text-brand-500 rounded border-neutral-300 focus:ring-brand-500"
                />
                <div>
                  <div className="text-sm font-medium">Tracks Expiry</div>
                  <div className="text-xs text-neutral-500">Document requires an expiry date</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-canvas-active rounded-lg hover:bg-canvas-subtle cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={editingType.active}
                  onChange={e => setEditingType({ ...editingType, active: e.target.checked })}
                  className="w-4 h-4 text-brand-500 rounded border-neutral-300 focus:ring-brand-500"
                />
                <div>
                  <div className="text-sm font-medium">Active</div>
                  <div className="text-xs text-neutral-500">Document type is visible and usable</div>
                </div>
              </label>
            </div>

            {/* ── Metadata Schema Builder ─────────────────────────────── */}
            <div className="pt-4 border-t border-canvas-subtle">
              <div className="mb-3">
                <div className="text-xs font-bold text-ink-secondary">Metadata Fields</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  Define what extra information must be captured when uploading a document of this type.
                </div>
              </div>
              <MetadataSchemaBuilder
                value={editingType.metadataSchema}
                onChange={json => setEditingType({ ...editingType, metadataSchema: json })}
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
