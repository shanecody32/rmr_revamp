'use client'

import TableToolbar from '@/components/common/data/tables/TableToolbar';
import {columnOptions} from '@/app/bands/components/bandColumns';
import {bandFilterOptions} from '@/lib/config/filterOptions';
import type {NameFilterType} from '@/types/api/common';

interface BandsToolbarProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    filterType: NameFilterType;
    setFilterType: (type: NameFilterType) => void;
    filters: Record<string, boolean>;
    setFilters: (filters: Record<string, boolean>) => void;
    visibleColumns: string[];
    setVisibleColumns: (columns: string[]) => void;
}

export default function BandsToolbar({
                                         searchTerm,
                                         setSearchTerm,
                                         filterType,
                                         setFilterType,
                                         filters,
                                         setFilters,
                                         visibleColumns,
                                         setVisibleColumns
                                     }: BandsToolbarProps) {
    return (
        <TableToolbar
            searchTerm={searchTerm}
            filterType={filterType}
            onSearch={setSearchTerm}
            onFilterTypeChange={setFilterType}
            onFilterChange={setFilters}
            onColumnChange={setVisibleColumns}
            filterOptions={[...bandFilterOptions]}
            columnOptions={[...columnOptions]}
            visibleColumns={visibleColumns}
            activeFilters={filters}
            searchPlaceholder="Search bands..."
        />
    );
}
