'use client'

import {Input} from 'antd';
import type {TextAreaProps} from 'antd/es/input';

export interface RichTextInputProps extends TextAreaProps {
    name?: string;
    label?: string;
    required?: boolean;
    rules?: any[];
    validator?: any;
    formatter?: any;
}

export function RichTextInput({
                                  rows = 6,
                                  ...props
                              }: RichTextInputProps) {
    return (
        <Input.TextArea autoSize={{minRows: rows}} {...props} />
    );
}