export interface DocumentType {
  documentTypeId: string;
  code: string;
  label: string;
  entityType: string;
  cardinalityMode: string;
  requiresSubcategory: boolean;
  hasExpiry: boolean;
  storageProvider: string;
  namingTemplate: string;
  /** JSON string serialized from MetadataSchema — stored as JSONB (metadata_schema_j) in the DB */
  metadataSchema?: string;
  active: boolean;
  updatedTs?: string;
}

/** A single configurable field in a document type's metadata schema */
export interface MetadataField {
  /** Machine-readable key, e.g. "invoiceNumber" */
  key: string;
  /** Human-readable label shown in forms, e.g. "Invoice Number" */
  label: string;
  /** Input type: text | date | number | select */
  type: 'text' | 'date' | 'number' | 'select';
  /** Whether the field must be filled when uploading a document of this type */
  required: boolean;
  /** Allowed values — only used when type === 'select' */
  options?: string[];
}

/** The parsed shape of metadataSchema JSON string */
export interface MetadataSchema {
  fields: MetadataField[];
}

/** Parse a raw metadataSchema string safely; returns empty schema on failure */
export function parseMetadataSchema(raw?: string): MetadataSchema {
  if (!raw) return { fields: [] };
  try {
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.fields) ? parsed : { fields: [] };
  } catch {
    return { fields: [] };
  }
}

