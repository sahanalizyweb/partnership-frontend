import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export function useList(path, params = {}, options = {}) {
  return useQuery({
    queryKey: [path, 'list', params],
    queryFn: async () => (await api.get(`/${path}`, { params })).data,
    ...options,
  });
}

export function useOne(path, id) {
  return useQuery({
    queryKey: [path, 'one', id],
    queryFn: async () => (await api.get(`/${path}/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreate(path) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post(`/${path}`, payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [path] }),
  });
}

export function useUpdate(path) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => (await api.put(`/${path}/${id}`, payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [path] }),
  });
}

export function useRemove(path) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/${path}/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [path] }),
  });
}

/** For workflow actions like POST /assignments/{id}/accept */
export function useAction(path) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, payload }) => (await api.post(`/${path}/${id}/${action}`, payload ?? {})).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [path] }),
  });
}
