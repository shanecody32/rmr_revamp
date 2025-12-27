import {Card} from 'antd';
import {PageHeader} from '@/components/layout';

export default function Index() {
    return (
        <>
            <PageHeader title="Dashboard"/>
            <Card title="Dashboard overview">
                <p>
                    Metrics will appear here once the dashboard is connected to the backend data
                    sources.
                </p>
            </Card>
        </>
    );
}
