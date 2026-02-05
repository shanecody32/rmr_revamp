'use client'

import {ArrowLeftOutlined} from '@ant-design/icons';
import {Button, Typography} from 'antd';
import Link from 'next/link';
import {Suspense} from 'react';

import {Breadcrumbs} from '@/components/common';
import type {BreadcrumbItem} from '@/components/common/navigation/Breadcrumbs';
import {useNavigationContext} from '@/hooks/useNavigationContext';

const {Title} = Typography;

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: BreadcrumbItem[];
    entityName?: string;
    actionName?: string;
    entityId?: string | number;
    entitySlug?: string;
    /** Static back href - will be overridden by navigation context if present */
    backHref?: string;
    /** Static back text - will be overridden by navigation context if present */
    backText?: string;
    /** Default context for back navigation (e.g., 'bands', 'albums') */
    defaultBackContext?: string;
    children?: React.ReactNode;
}

/**
 * Inner component that uses the navigation context hook.
 * Wrapped in Suspense because useSearchParams requires it.
 */
function PageHeaderInner({
    title,
    subtitle,
    breadcrumbs,
    entityName,
    actionName,
    entityId,
    entitySlug,
    backHref: staticBackHref,
    backText: staticBackText = 'Back',
    defaultBackContext = 'bands',
    children
}: PageHeaderProps) {
    const nav = useNavigationContext(defaultBackContext);

    // Use contextual navigation if available, otherwise fall back to static props
    const backHref = nav.hasContext ? nav.backHref : staticBackHref;
    const backText = nav.hasContext ? nav.backText : staticBackText;

    // Build contextual breadcrumbs if we have navigation context
    const contextualBreadcrumbs = breadcrumbs || (nav.hasContext && entityName ? buildContextualBreadcrumbs(nav, entityName, actionName, entityId, entitySlug) : undefined);

    return (
        <div className="mb-2">
            <div className="mb-1">
                <Breadcrumbs
                    items={contextualBreadcrumbs}
                    entityName={!contextualBreadcrumbs ? entityName : undefined}
                    actionName={!contextualBreadcrumbs ? actionName : undefined}
                    entityId={!contextualBreadcrumbs ? entityId : undefined}
                    entitySlug={!contextualBreadcrumbs ? entitySlug : undefined}
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

/**
 * Build breadcrumbs with navigation context.
 */
function buildContextualBreadcrumbs(
    nav: ReturnType<typeof useNavigationContext>,
    entityName: string,
    actionName?: string,
    entityId?: string | number,
    entitySlug?: string
): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
        {href: '/', label: 'Home'},
    ];

    // Add the contextual source (e.g., "Duplicate Check" or "Bands")
    items.push({
        href: nav.backHref,
        label: nav.breadcrumbLabel,
    });

    // Add the current page
    if (actionName && entityId && entitySlug) {
        const actionNameCapitalized = actionName.charAt(0).toUpperCase() + actionName.slice(1);
        const entityLabel = entitySlug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        items.push({
            href: `/${entityName}/${actionName}/${entityId}/${entitySlug}`,
            label: `${actionNameCapitalized}: ${entityLabel}`,
            active: true,
        });
    } else if (actionName) {
        const actionNameCapitalized = actionName.charAt(0).toUpperCase() + actionName.slice(1);
        items.push({
            href: `/${entityName}/${actionName}`,
            label: actionNameCapitalized,
            active: true,
        });
    }

    return items;
}

/**
 * Page header component with contextual navigation support.
 *
 * Automatically reads the `from` query parameter to determine where the user
 * came from, and adjusts the back button and breadcrumbs accordingly.
 *
 * @example
 * // Basic usage - will use navigation context if ?from= is present
 * <PageHeader
 *     title="Band Details"
 *     entityName="bands"
 *     actionName="view"
 *     entityId={id}
 *     entitySlug={slug}
 *     backHref="/bands"      // Fallback if no context
 *     backText="Back to Bands"
 * />
 */
export default function PageHeader(props: PageHeaderProps) {
    return (
        <Suspense fallback={
            <div className="mb-2">
                <div className="mb-1">
                    <Breadcrumbs
                        entityName={props.entityName}
                        actionName={props.actionName}
                        entityId={props.entityId}
                        entitySlug={props.entitySlug}
                    />
                </div>
                <div className="flex justify-between items-center">
                    <div>
                        {props.backHref && (
                            <div className="mb-1">
                                <Link href={props.backHref}>
                                    <Button type="link" className="px-0" icon={<ArrowLeftOutlined/>}>
                                        {props.backText || 'Back'}
                                    </Button>
                                </Link>
                            </div>
                        )}
                        <Title level={2} className="!my-1">{props.title}</Title>
                        {props.subtitle && (
                            <div className="text-gray-500">{props.subtitle}</div>
                        )}
                    </div>
                    <div>{props.children}</div>
                </div>
            </div>
        }>
            <PageHeaderInner {...props} />
        </Suspense>
    );
}
