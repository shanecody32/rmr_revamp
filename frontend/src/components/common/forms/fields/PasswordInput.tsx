'use client'

import {Input} from 'antd';
import type {PasswordProps} from 'antd/es/input';

export const PasswordInput: React.FC<PasswordProps> = (props) => {
    return <Input.Password {...props} />;
};