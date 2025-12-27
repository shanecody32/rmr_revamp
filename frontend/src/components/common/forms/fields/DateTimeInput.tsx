'use client'

import type {DatePickerProps} from 'antd';
import {DatePicker} from 'antd';

export const DateTimeInput: React.FC<DatePickerProps> = (props) => {
    return <DatePicker showTime style={{width: '100%'}} {...props} />;
};