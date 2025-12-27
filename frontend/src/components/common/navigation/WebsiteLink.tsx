'use client'

import {LinkOutlined} from '@ant-design/icons';

interface WebsiteLinkProps {
    href: string;
}

export default function WebsiteLink({href}: WebsiteLinkProps) {
    // Make sure the href has a protocol
    const formattedHref = href.startsWith('http') ? href : `https://${href}`;

    // Display URL without protocol for cleaner UI
    const displayUrl = formattedHref.replace(/^https?:\/\//, '');

    return (
        <a
            href={formattedHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
            onClick={(e) => e.stopPropagation()}
        >
            <LinkOutlined className="text-xs"/>
            <span>{displayUrl}</span>
        </a>
    );
}