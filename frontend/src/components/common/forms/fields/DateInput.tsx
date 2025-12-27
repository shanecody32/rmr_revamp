'use client'

import type {DatePickerProps} from 'antd';
import {DatePicker} from 'antd';

export const DateInput: React.FC<DatePickerProps> = (props) => {
    return <DatePicker style={{width: '100%'}} {...props} />;
};