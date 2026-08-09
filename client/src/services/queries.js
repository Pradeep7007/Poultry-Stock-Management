import { QueryClient } from '@tanstack/react-query';
import api from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: true, // we want it to fetch if stale
    },
  },
});

// Query keys
export const KEYS = {
  EGGS: ['eggs'],
  BATCHES: ['batches'],
  HENS: ['hens'],
  FEED: ['feed'],
  VACCINES: ['vaccines'],
};

// Query functions
export const fetchEggs = async () => {
  const { data } = await api.get('/eggs');
  return data;
};

export const fetchBatches = async () => {
  const { data } = await api.get('/batches');
  return data;
};

export const fetchHens = async () => {
  const { data } = await api.get('/hens');
  return data;
};

export const fetchFeed = async () => {
  const { data } = await api.get('/feed');
  return data;
};

export const fetchVaccines = async () => {
  const { data } = await api.get('/vaccines');
  return data;
};

export const prefetchAllDashboardData = async () => {
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: KEYS.EGGS, queryFn: fetchEggs }),
    queryClient.prefetchQuery({ queryKey: KEYS.BATCHES, queryFn: fetchBatches }),
    queryClient.prefetchQuery({ queryKey: KEYS.HENS, queryFn: fetchHens }),
    queryClient.prefetchQuery({ queryKey: KEYS.FEED, queryFn: fetchFeed }),
    queryClient.prefetchQuery({ queryKey: KEYS.VACCINES, queryFn: fetchVaccines })
  ]);
};
