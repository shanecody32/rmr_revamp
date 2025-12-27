'use client'

import {Card} from 'antd';
import type {ReactNode} from 'react';

interface TableContainerProps {
    title: string;
    actions: ReactNode;
    children: ReactNode;
}

export default function TableContainer({
                                           title,
                                           actions,
                                           children
                                       }: TableContainerProps) {
    return (
        <Card
            title={
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold m-0">{title}</h1>
                    {actions}
                </div>
            }
            className="overflow-hidden"
            styles={{
                body: {
                    padding: 0
                }
            }}
        >
            <div className="overflow-x-auto">
                {children}
            </div>
        </Card>
    );
}