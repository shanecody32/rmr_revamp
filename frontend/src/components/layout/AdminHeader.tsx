'use client'

import {LogoutOutlined, SettingOutlined, UserOutlined} from '@ant-design/icons';
import type {MenuProps} from 'antd';
import {Avatar, Button, Dropdown, Layout, Space} from 'antd';

const {Header} = Layout;

export default function AdminHeader() {
    const userMenuItems: MenuProps['items'] = [
        {
            key: 'profile',
            icon: <UserOutlined/>,
            label: 'Profile',
        },
        {
            key: 'settings',
            icon: <SettingOutlined/>,
            label: 'Settings',
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            icon: <LogoutOutlined/>,
            label: 'Logout',
        },
    ];

    return (
        <Header style={{padding: '0 24px', background: '#fff'}}>
            <div className="flex justify-end items-center h-full">
                <Space>
                    <Dropdown menu={{items: userMenuItems}} placement="bottomRight">
                        <Button type="text" icon={<Avatar icon={<UserOutlined/>}/>}/>
                    </Dropdown>
                </Space>
            </div>
        </Header>
    );
}