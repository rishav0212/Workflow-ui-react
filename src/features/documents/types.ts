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
  metadataSchema?: string;
  active: boolean;
  updatedTs?: string;
}
