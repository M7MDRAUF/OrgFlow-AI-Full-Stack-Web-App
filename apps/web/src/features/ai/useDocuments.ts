// rag-ingest-agent — React hooks for admin document management.
import type { DocumentResponseDto, DocumentVisibility, UserRole } from '@orgflow/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api-client.js';
import { QUERY_KEYS } from '../../lib/query-keys.js';

export interface ListDocumentsFilters {
  visibility?: DocumentVisibility;
  teamId?: string;
  projectId?: string;
}

export function useDocuments(
  filters?: ListDocumentsFilters,
): ReturnType<typeof useQuery<DocumentResponseDto[]>> {
  return useQuery<DocumentResponseDto[]>({
    queryKey: [...QUERY_KEYS.documents, filters ?? {}],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<{
        success: true;
        data: { documents: DocumentResponseDto[] };
      }>('/ai/documents', { params: filters, signal });
      return res.data.data.documents;
    },
  });
}

export interface UploadDocumentVars {
  file: File;
  title: string;
  visibility: DocumentVisibility;
  teamId?: string;
  projectId?: string;
  allowedRoles?: UserRole[];
}

export function useUploadDocument(): ReturnType<
  typeof useMutation<DocumentResponseDto, Error, UploadDocumentVars>
> {
  const qc = useQueryClient();
  return useMutation<DocumentResponseDto, Error, UploadDocumentVars>({
    mutationFn: async (vars) => {
      const form = new FormData();
      form.append('file', vars.file);
      form.append('title', vars.title);
      form.append('visibility', vars.visibility);
      if (vars.teamId !== undefined) form.append('teamId', vars.teamId);
      if (vars.projectId !== undefined) form.append('projectId', vars.projectId);
      if (vars.allowedRoles !== undefined) {
        for (const role of vars.allowedRoles) form.append('allowedRoles', role);
      }
      const res = await apiClient.post<{
        success: true;
        data: { document: DocumentResponseDto };
      }>('/ai/documents', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data.document;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.documents });
      toast.success('Document uploaded');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
    },
  });
}

export function useDeleteDocument(): ReturnType<
  typeof useMutation<{ deleted: true }, Error, string>
> {
  const qc = useQueryClient();
  return useMutation<{ deleted: true }, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/ai/documents/${id}`);
      return { deleted: true };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.documents });
      toast.success('Document deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Something went wrong');
    },
  });
}
