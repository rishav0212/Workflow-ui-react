import api from '../../api';
import { type DocumentType } from './types';

export const documentTypeApi = {
  getAll: () =>
    api.get<{ success: boolean; data: DocumentType[] }>('/api/admin/document-types'),

  create: (data: Partial<DocumentType>) =>
    api.post<{ success: boolean; data: DocumentType }>('/api/admin/document-types', data),

  update: (id: string, data: Partial<DocumentType>) =>
    api.put<{ success: boolean; data: DocumentType }>(`/api/admin/document-types/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean; data: null }>(`/api/admin/document-types/${id}`),
};
