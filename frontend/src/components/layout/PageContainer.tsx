'use client'

import {Layout} from 'antd';

interface PageContainerProps {
    children: React.ReactNode;
}

export default function PageContainer({children}: PageContainerProps) {
    return (
        <Layout.Content style={{padding: '12px 16px'}}>
            {children}
        </Layout.Content>
    );
}