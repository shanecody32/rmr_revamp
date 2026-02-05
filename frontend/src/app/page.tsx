import { Card } from 'antd';

import { PageHeader } from '@/components/layout';

export const metadata = {
    title: 'Dashboard - RMR Admin',
    description: 'Roots Music Report Admin Dashboard',
};

export default function Dashboard() {
    return (
        <>
            <PageHeader title="Dashboard" />
            <Card title="Dashboard overview">
                <p>
                    Metrics will appear here once the dashboard is connected to the backend data
                    sources.
                </p>
            </Card>
        </>
    );
}
