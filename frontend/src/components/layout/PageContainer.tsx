'use client'

import {Layout} from 'antd';

interface PageContainerProps {
    children: React.ReactNode;
}

export default function PageContainer({children}: PageContainerProps) {
    return (
        <Layout.Content style={{padding: '24px'}}>
            {children}
        </Layout.Content>
    );
}