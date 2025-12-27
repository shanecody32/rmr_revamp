'use client'

import {StyleProvider} from '@ant-design/cssinjs';
import {App, ConfigProvider, Layout, theme} from 'antd';
import enUS from 'antd/locale/en_US';
import * as React from 'react';


import {AuthProvider} from '@/contexts/AuthContext';
import {LocationProvider} from '@/contexts/LocationContext';

import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import PageContainer from './PageContainer';

interface RootLayoutClientProps {
    children: React.ReactNode;
}

export default function RootLayoutClient({children}: RootLayoutClientProps) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <StyleProvider hashPriority="high">
            <AuthProvider>
                <LocationProvider>
                    <ConfigProvider
                        locale={enUS}
                        theme={{
                            algorithm: theme.defaultAlgorithm,
                            token: {
                                colorPrimary: '#1677ff',
                            },
                            components: {
                                Layout: {
                                    bodyBg: '#f5f5f5',
                                    headerBg: '#fff',
                                    headerPadding: '0 24px',
                                    siderBg: '#001529',
                                }
                            }
                        }}
                    >
                        <App>
                            <Layout hasSider style={{minHeight: '100vh'}}>
                                <AdminSidebar/>
                                <Layout>
                                    <AdminHeader/>
                                    <PageContainer>{children}</PageContainer>
                                </Layout>
                            </Layout>
                        </App>
                    </ConfigProvider>
                </LocationProvider>
            </AuthProvider>
        </StyleProvider>
    );
}
