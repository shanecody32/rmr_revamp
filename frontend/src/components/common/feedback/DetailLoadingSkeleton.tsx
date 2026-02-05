'use client'

import { Skeleton, Card } from 'antd';

interface DetailLoadingSkeletonProps {
    showImage?: boolean;
    sections?: number;
    className?: string;
}

export default function DetailLoadingSkeleton({
    showImage = true,
    sections = 3,
    className = '',
}: DetailLoadingSkeletonProps) {
    return (
        <div className={`p-4 ${className}`}>
            <Card className="mb-4">
                <div className="flex gap-6">
                    {/* Image placeholder */}
                    {showImage && (
                        <Skeleton.Image
                            active
                            style={{ width: 200, height: 200 }}
                        />
                    )}

                    {/* Main info */}
                    <div className="flex-1">
                        <Skeleton.Input
                            active
                            size="large"
                            style={{ width: 300, marginBottom: 16 }}
                        />
                        <div className="space-y-3">
                            <Skeleton paragraph={{ rows: 2 }} active />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Additional sections */}
            {Array.from({ length: sections }).map((_, i) => (
                <Card key={`section-${i}`} className="mb-4">
                    <Skeleton.Input
                        active
                        size="small"
                        style={{ width: 150, marginBottom: 16 }}
                    />
                    <Skeleton paragraph={{ rows: 3 }} active />
                </Card>
            ))}
        </div>
    );
}
