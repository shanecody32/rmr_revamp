'use client'


import {
  ApiOutlined,
  BarChartOutlined,
  CopyOutlined,
  CustomerServiceOutlined,
  HomeOutlined,
  PictureOutlined,
  SettingOutlined,
  SoundOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type {MenuProps} from 'antd';
import {Layout, Menu} from 'antd';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';

const {Sider} = Layout;

type MenuItem = Required<MenuProps>['items'][number];

export default function AdminSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    // Determine which menu key should be selected based on pathname
    const getSelectedKey = () => {
        if (pathname?.startsWith('/bands/duplicates')) return '/bands/duplicates';
        if (pathname?.startsWith('/bands')) return '/bands';
        if (pathname?.startsWith('/staff')) return '/staff';
        return pathname || '/';
    };

    // Determine which submenu should be open
    const getOpenKeys = () => {
        if (pathname?.startsWith('/bands')) return ['bands-submenu'];
        if (pathname?.startsWith('/radio-stations') || pathname?.startsWith('/staff')) return ['stations-submenu'];
        return [];
    };

    const menuItems: MenuItem[] = [
        {
            key: '/',
            icon: <HomeOutlined/>,
            label: <Link href="/">Dashboard</Link>,
        },
        {
            key: 'bands-submenu',
            icon: <TeamOutlined/>,
            label: 'Bands',
            children: [
                {
                    key: '/bands',
                    icon: <UnorderedListOutlined/>,
                    label: <Link href="/bands">All Bands</Link>,
                },
                {
                    key: '/bands/duplicates',
                    icon: <CopyOutlined/>,
                    label: <Link href="/bands/duplicates">Duplicate Checker</Link>,
                },
            ],
        },
        {
            key: '/songs',
            icon: <SoundOutlined/>,
            label: <Link href="/songs">Songs</Link>,
        },
        {
            key: '/albums',
            icon: <PictureOutlined/>,
            label: <Link href="/albums">Albums</Link>,
        },
        {
            key: 'stations-submenu',
            icon: <CustomerServiceOutlined/>,
            label: 'Radio Stations',
            children: [
                {
                    key: '/radio-stations',
                    icon: <UnorderedListOutlined/>,
                    label: <Link href="/radio-stations">All Stations</Link>,
                },
                {
                    key: '/staff',
                    icon: <UserOutlined/>,
                    label: <Link href="/staff">Staff Members</Link>,
                },
            ],
        },
        {
            key: '/charts',
            icon: <BarChartOutlined/>,
            label: <Link href="/charts">Charts</Link>,
        },
        {
            key: '/system',
            icon: <SettingOutlined/>,
            label: <Link href="/system">System</Link>,
        },
        {
            key: 'rapidoc',
            icon: <ApiOutlined/>,
            label: (
                <a href="http://localhost:8000/rapidoc" target="_blank" rel="noopener noreferrer">
                    API Docs
                </a>
            ),
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
                selectedKeys={[getSelectedKey()]}
                defaultOpenKeys={getOpenKeys()}
                items={menuItems}
            />
        </Sider>
    );
}