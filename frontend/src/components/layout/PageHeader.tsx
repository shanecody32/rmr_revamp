'use client'

import {ArrowLeftOutlined} from '@ant-design/icons';
import {Button, Typography} from 'antd';
import Link from 'next/link';

import {Breadcrumbs} from '@/components/common';
import type {BreadcrumbItem} from '@/components/common/navigation/Breadcrumbs';

const {Title} = Typography;

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: BreadcrumbItem[];
    entityName?: string;
    actionName?: string;
    entityId?: string | number;
    entitySlug?: string;
    backHref?: string;
    backText?: string;
    children?: React.ReactNode;
}

export default function PageHeader({
                                       title,
                                       subtitle,
                                       breadcrumbs,
                                       entityName,
                                       actionName,
                                       entityId,
                                       entitySlug,
                                       backHref,
                                       backText = 'Back',
                                       children
                                   }: PageHeaderProps) {
    return (
        <div className="mb-6">
            <div className="mb-2">
                <Breadcrumbs
                    items={breadcrumbs}
                    entityName={entityName}
                    actionName={actionName}
                    entityId={entityId}
                    entitySlug={entitySlug}
                />
            </div>

            <div className="flex justify-between items-center">
                <div>
                    {backHref && (
                        <div className="mb-1">
                            <Link href={backHref}>
                                <Button type="link" className="px-0" icon={<ArrowLeftOutlined/>}>
                                    {backText}
                                </Button>
                            </Link>
                        </div>
                    )}

                    <Title level={2} className="!my-1">{title}</Title>
                    {subtitle && (
                        <div className="text-gray-500">{subtitle}</div>
                    )}
                </div>

                <div>
                    {children}
                </div>
            </div>
        </div>
    );
}
