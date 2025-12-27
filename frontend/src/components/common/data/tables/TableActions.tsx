'use client'

import {FilterOutlined, PlusOutlined} from '@ant-design/icons';
import {Button, Space} from 'antd';

interface TableActionsProps {
    children: React.ReactNode;
    onAdvancedSearch?: () => void;
    onAdd?: () => void;
    addButtonText?: string;
}

export default function TableActions({
                                         children,
                                         onAdvancedSearch,
                                         onAdd,
                                         addButtonText = 'Add'
                                     }: TableActionsProps) {
    return (
        <Space size="middle">
            {children}

            {onAdvancedSearch && (
                <Button
                    icon={<FilterOutlined/>}
                    onClick={onAdvancedSearch}
                >
                    Advanced Search
                </Button>
            )}

            {onAdd && (
                <Button
                    type="primary"
                    icon={<PlusOutlined/>}
                    onClick={onAdd}
                >
                    {addButtonText}
                </Button>
            )}
        </Space>
    );
}
