'use client'


import {
    FacebookOutlined,
    GithubOutlined,
    InstagramOutlined,
    LinkedinOutlined,
    TwitterOutlined,
} from '@ant-design/icons';
import {Input, Space} from 'antd';

export interface SocialLinks {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    github?: string;
}

export interface SocialInputProps {
    value?: SocialLinks;
    onChange?: (value: SocialLinks) => void;
}

export const SocialInput: React.FC<SocialInputProps> = ({value = {}, onChange}) => {
    const handleChange = (platform: keyof SocialLinks, url: string) => {
        const newValue = {...value, [platform]: url};
        onChange?.(newValue);
    };

    return (
        <Space orientation="vertical" className="w-full">
            <Input
                prefix={<FacebookOutlined className="text-[#1877F2]"/>}
                placeholder="Facebook URL"
                value={value.facebook}
                onChange={(e) => handleChange('facebook', e.target.value)}
            />

            <Input
                prefix={<TwitterOutlined className="text-[#1DA1F2]"/>}
                placeholder="Twitter URL"
                value={value.twitter}
                onChange={(e) => handleChange('twitter', e.target.value)}
            />

            <Input
                prefix={<InstagramOutlined className="text-[#E4405F]"/>}
                placeholder="Instagram URL"
                value={value.instagram}
                onChange={(e) => handleChange('instagram', e.target.value)}
            />

            <Input
                prefix={<LinkedinOutlined className="text-[#0A66C2]"/>}
                placeholder="LinkedIn URL"
                value={value.linkedin}
                onChange={(e) => handleChange('linkedin', e.target.value)}
            />

            <Input
                prefix={<GithubOutlined/>}
                placeholder="GitHub URL"
                value={value.github}
                onChange={(e) => handleChange('github', e.target.value)}
            />
        </Space>
    );
};