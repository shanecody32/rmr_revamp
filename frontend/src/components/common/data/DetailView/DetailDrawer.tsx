'use client'


import {
    ApiOutlined,
    CustomerServiceOutlined,
    EditOutlined,
    EyeOutlined,
    InfoCircleOutlined,
    LinkOutlined
} from '@ant-design/icons';
import {Button, Drawer, Space, Tabs} from 'antd';
import Link from 'next/link';

import type {BandResponse, BandWithDiscographyResponse} from '@/types/api/bands';
import type {BaseEntity} from '@/types/api/common';

import BasicInfoTab from './Tabs/BasicInfoTab';
import DiscographyTab from './Tabs/DiscographyTab';
import ExternalIdsTab from './Tabs/ExternalIdsTab';
import SocialLinksTab from './Tabs/SocialLinksTab';


interface DetailDrawerProps<T extends BaseEntity> {
    open: boolean;
    onClose: () => void;
    data: T | null;
    title: string;
    extraFields?: {
        label: string;
        key: keyof T;
        render?: (value: T[keyof T], record: T) => React.ReactNode;
        span?: number;
        editable?: boolean;
    }[];
    onSave?: (values: Partial<T>) => Promise<void>;
}

export default function DetailDrawer<T extends BaseEntity>({
                                                               open,
                                                               onClose,
                                                               data,
                                                               title,
                                                               extraFields = [],
                                                               onSave
                                                           }: DetailDrawerProps<T>) {
    if (!data) return null;

    // Type guard to check if entity is a band
    const isBand = (entity: BaseEntity): entity is BandResponse => {
        return 'website' in entity;
    };

    // Type guard to check if entity is a band with discography
    const isBandWithDiscography = (entity: BaseEntity): entity is BandWithDiscographyResponse => {
        return isBand(entity) && 'albums' in entity;
    };

    const items = [
        {
            key: 'basic',
            label: (
                <span className="flex items-center gap-1">
          <InfoCircleOutlined/>
          <span>Basic Info</span>
        </span>
            ),
            children: (
                <BasicInfoTab
                    data={data}
                    extraFields={extraFields}
                    onSave={onSave}
                />
            )
        },
        ...(isBand(data) ? [
            {
                key: 'social',
                label: (
                    <span className="flex items-center gap-1">
            <LinkOutlined/>
            <span>Social Links</span>
          </span>
                ),
                children: <SocialLinksTab data={data}/>
            },
            {
                key: 'external',
                label: (
                    <span className="flex items-center gap-1">
            <ApiOutlined/>
            <span>External IDs</span>
          </span>
                ),
                children: <ExternalIdsTab data={data}/>
            }
        ] : []),
        ...(isBandWithDiscography(data) ? [
            {
                key: 'discography',
                label: (
                    <span className="flex items-center gap-1">
            <CustomerServiceOutlined/>
            <span>Discography</span>
          </span>
                ),
                children: <DiscographyTab albums={data.albums || []}/>
            }
        ] : [])
    ];

    return (
        <>
            <Drawer
                title={
                    <div className="flex items-center justify-between">
                        <span>{title}</span>
                        {isBand(data) && (
                            <Space>
                                <Link
                                    href={`/bands/edit/${data.id}/${data.slug}`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Button
                                        icon={<EditOutlined/>}
                                    >
                                        Edit
                                    </Button>
                                </Link>
                                <Link
                                    href={`/bands/view/${data.id}/${data.slug}`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Button
                                        type="primary"
                                        icon={<EyeOutlined/>}
                                    >
                                        View Full Page
                                    </Button>
                                </Link>
                            </Space>
                        )}
                    </div>
                }
                placement="right"
                size={800}
                onClose={onClose}
                open={open}
                destroyOnClose
                className="details-drawer"
                styles={{
                    body: {
                        padding: 0,
                        height: 'calc(100% - 55px)',
                        overflow: 'hidden'
                    }
                }}
            >
                <Tabs
                    defaultActiveKey="basic"
                    items={items}
                    className="h-full drawer-tabs"
                />
            </Drawer>
            <style jsx global>{`
        .details-drawer .ant-drawer-header {
          padding: 16px 24px;
          border-bottom: 1px solid #f0f0f0;
          background: #fff;
        }

        .details-drawer .ant-drawer-title {
          font-size: 16px;
          font-weight: 600;
        }

        .details-drawer .drawer-tabs {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .details-drawer .ant-tabs-nav {
          margin: 0;
          padding: 0 24px;
          background: #fff;
          border-bottom: 1px solid #f0f0f0;
        }

        .details-drawer .ant-tabs-content-holder {
          flex: 1;
          overflow: auto;
        }

        .details-drawer .ant-tabs-content {
          height: 100%;
        }

        .details-drawer .ant-tabs-tabpane {
          padding: 24px;
          height: 100%;
          overflow: auto;
          background: #f5f5f5;
        }

        .details-drawer .ant-descriptions {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .details-drawer .ant-descriptions-item-label {
          width: 120px;
          font-weight: 500;
          color: #1f2937;
          background: #fafafa;
        }

        .details-drawer .ant-descriptions-item-content {
          color: #374151;
        }
      `}</style>
        </>
    );
}
