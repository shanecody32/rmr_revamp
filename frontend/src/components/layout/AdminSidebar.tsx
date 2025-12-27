'use client'


import {
  BarChartOutlined,
  CustomerServiceOutlined,
  HomeOutlined,
  PictureOutlined,
  SoundOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {Layout, Menu} from 'antd';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useState} from 'react';

const {Sider} = Layout;

export default function AdminSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const menuItems = [
        {
            key: '/',
            icon: <HomeOutlined/>,
            label: 'Dashboard',
        },
        {
            key: '/bands',
            icon: <TeamOutlined/>,
            label: 'Bands',
        },
        {
            key: '/songs',
            icon: <SoundOutlined/>,
            label: 'Songs',
        },
        {
            key: '/albums',
            icon: <PictureOutlined/>,
            label: 'Albums',
        },
        {
            key: '/radio-stations',
            icon: <CustomerServiceOutlined/>,
            label: 'Radio Stations',
        },
        {
            key: '/charts',
            icon: <BarChartOutlined/>,
            label: 'Charts',
        },
    ];

    return (
        <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            style={{
                overflow: 'auto',
                height: '100vh',
                position: 'sticky',
                left: 0,
                top: 0,
                bottom: 0,
            }}
        >
            <div className="p-4 text-white text-center">
                <h1 className="text-lg font-bold">RMR Admin</h1>
            </div>
            <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[pathname || '/']}
                items={menuItems.map(item => ({
                    ...item,
                    label: (
                        <Link href={item.key}>
                            {item.label}
                        </Link>
                    )
                }))}
            />
        </Sider>
    );
}