'use client'

import type {TimePickerProps} from 'antd';
import {TimePicker} from 'antd';

export const TimeInput: React.FC<TimePickerProps> = (props) => {
    return <TimePicker style={{width: '100%'}} {...props} />;
};
