'use client'

import {Tabs} from 'antd';
import {useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {Textarea} from '@/components/ui/inputs/textarea';

export interface MarkdownInputProps {
    value?: string;
    onChange?: (value: string) => void;

    [key: string]: any;
}

export const MarkdownInput: React.FC<MarkdownInputProps> = ({value = '', onChange, ...props}) => {
    const [activeTab, setActiveTab] = useState('edit');

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e.target.value);
    };

    const items = [
        {
            key: 'edit',
            label: 'Edit',
            children: (
                <Textarea
                    value={value}
                    onChange={handleChange}
                    className="w-full min-h-[200px] font-mono"
                    autoSize={{minRows: 8}}
                    {...props}
                />
            ),
        },
        {
            key: 'preview',
            label: 'Preview',
            children: (
                <div className="prose max-w-none p-4 border rounded-md bg-white">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {value}
                    </ReactMarkdown>
                </div>
            ),
        },
    ];

    return (
        <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={items}
            className="markdown-editor"
        />
    );
};
