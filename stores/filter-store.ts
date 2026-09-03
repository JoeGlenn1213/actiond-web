'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActionRunStatus } from '@/lib/types';

export type StatusFilter = ActionRunStatus | 'all';
export type SortField = 'created_at' | 'duration_ms' | 'status';
export type SortOrder = 'asc' | 'desc';

interface FilterState {
    // Single-select filters ('' or 'all' means no filtering)
    status: StatusFilter;
    repo: string;
    plugin: string;

    // Search (matches repo / action / run_id / event_id)
    searchQuery: string;

    // Sort
    sortBy: SortField;
    sortOrder: SortOrder;

    // Pagination
    page: number;
    pageSize: number;

    setStatus: (status: StatusFilter) => void;
    setRepo: (repo: string) => void;
    setPlugin: (plugin: string) => void;
    setSearchQuery: (query: string) => void;
    setSortBy: (sortBy: SortField) => void;
    setSortOrder: (order: SortOrder) => void;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
    resetFilters: () => void;
}

const initialState = {
    status: 'all' as StatusFilter,
    repo: '',
    plugin: '',
    searchQuery: '',
    sortBy: 'created_at' as SortField,
    sortOrder: 'desc' as SortOrder,
    page: 1,
    pageSize: 10,
};

export const useFilterStore = create<FilterState>()(
    persist(
        (set) => ({
            ...initialState,

            setStatus: (status) => set({ status, page: 1 }),
            setRepo: (repo) => set({ repo, page: 1 }),
            setPlugin: (plugin) => set({ plugin, page: 1 }),
            setSearchQuery: (searchQuery) => set({ searchQuery, page: 1 }),
            setSortBy: (sortBy) => set({ sortBy }),
            setSortOrder: (sortOrder) => set({ sortOrder }),
            setPage: (page) => set({ page }),
            setPageSize: (pageSize) => set({ pageSize, page: 1 }),
            resetFilters: () => set({ ...initialState }),
        }),
        {
            name: 'actiond-filter-storage',
            partialize: (state) => ({
                sortBy: state.sortBy,
                sortOrder: state.sortOrder,
                pageSize: state.pageSize,
            }),
        }
    )
);
