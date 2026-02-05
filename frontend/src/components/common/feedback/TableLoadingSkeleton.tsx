'use client'

import { Skeleton } from 'antd';

interface TableLoadingSkeletonProps {
    rows?: number;
    columns?: number;
    showHeader?: boolean;
    className?: string;
}

export default function TableLoadingSkeleton({
    rows = 5,
    columns = 4,
    showHeader = true,
    className = '',
}: TableLoadingSkeletonProps) {
    return (
        <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
            {/* Header skeleton */}
            {showHeader && (
                <div className="flex justify-between items-center mb-4">
                    <Skeleton.Input active size="small" style={{ width: 200 }} />
                    <div className="flex gap-2">
                        <Skeleton.Button active size="small" style={{ width: 100 }} />
                        <Skeleton.Button active size="small" style={{ width: 100 }} />
                    </div>
                </div>
            )}

            {/* Search/filter bar skeleton */}
            <div className="flex gap-2 mb-4">
                <Skeleton.Input active size="default" style={{ width: 300 }} />
                <Skeleton.Button active size="default" style={{ width: 80 }} />
            </div>

            {/* Table header skeleton */}
            <div className="border-b border-gray-200 pb-3 mb-2">
                <div className="flex gap-4">
                    {Array.from({ length: columns }).map((_, i) => (
                        <Skeleton.Input
                            key={`header-${i}`}
                            active
                            size="small"
                            style={{ width: i === 0 ? 60 : 120 }}
                        />
                    ))}
                </div>
            </div>

            {/* Table rows skeleton */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div
                    key={`row-${rowIndex}`}
                    className="flex gap-4 py-3 border-b border-gray-100"
                >
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <Skeleton.Input
                            key={`cell-${rowIndex}-${colIndex}`}
                            active
                            size="small"
                            style={{
                                width: colIndex === 0 ? 60 : colIndex === 1 ? 180 : 100,
                            }}
                        />
                    ))}
                </div>
            ))}

            {/* Pagination skeleton */}
            <div className="flex justify-end mt-4">
                <Skeleton.Input active size="small" style={{ width: 200 }} />
            </div>
        </div>
    );
}
