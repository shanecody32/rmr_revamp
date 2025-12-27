'use client'

import {LoadingOutlined} from '@ant-design/icons';
import {Spin} from 'antd';

interface LoadingSpinnerProps {
    size?: number;
    className?: string;
}

export default function LoadingSpinner({size = 24, className}: LoadingSpinnerProps) {
    return (
        <div className={`flex items-center justify-center ${className}`}>
            <Spin indicator={<LoadingOutlined style={{fontSize: size}} spin/>}/>
        </div>
    );
}
