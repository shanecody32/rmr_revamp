// This comment ensures the DOCTYPE is included in the HTML output
import {Inter} from 'next/font/google';

import './globals.css';
import RootLayoutClient from '@/components/layout/RootLayoutClient';

const inter = Inter({subsets: ['latin']});

export const metadata = {
    title: 'RMR Admin',
    description: 'Roots Music Report Admin Dashboard',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.className} no-margin`}>
                <RootLayoutClient>{children}</RootLayoutClient>
            </body>
        </html>
    );
}
