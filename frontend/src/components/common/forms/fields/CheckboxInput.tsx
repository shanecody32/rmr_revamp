'use client'

import type {CheckboxProps} from 'antd';
import {Checkbox} from 'antd';

export const CheckboxInput: React.FC<CheckboxProps> = (props) => {
    return <Checkbox {...props} />;
};