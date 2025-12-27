'use client'

import {Card} from 'antd';

import EntityForm from '@/components/common/forms/EntityForm';

// Import the FormField type from the EntityForm component
interface FormField {
    name: string;
    label: string;
    type?: 'text' | 'email' | 'number' | 'select' | 'switch';
    required?: boolean;
    options?: Array<{ label: string; value: string | number }>;
    min?: number;
    max?: number;
}

// Only using field types that are supported by the FormField interface
const testFields: FormField[] = [
    // Text inputs
    {
        name: 'text',
        label: 'Text Input',
        type: 'text',
        required: true
    },
    {
        name: 'email',
        label: 'Email Input',
        type: 'email',
        required: true
    },
    {
        name: 'password',
        label: 'Password Input (rendered as text)',
        type: 'text',
        required: true
    },
    {
        name: 'number',
        label: 'Number Input',
        type: 'number'
    },

    // Selection inputs
    {
        name: 'select',
        label: 'Select Input',
        type: 'select',
        options: [
            {label: 'Option 1', value: '1'},
            {label: 'Option 2', value: '2'},
            {label: 'Option 3', value: '3'}
        ]
    },
    {
        name: 'switch',
        label: 'Switch Input',
        type: 'switch'
    }
];

export default function FormTestPage() {
    const handleSubmit = (values: Record<string, unknown>) => {
        console.warn('Form values:', values);
    };

    return (
        <Card title="Form Field Types Test">
            <EntityForm
                fields={testFields}
                onFinish={handleSubmit}
            />
        </Card>
    );
}
