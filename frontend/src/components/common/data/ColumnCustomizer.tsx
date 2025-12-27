import {SettingOutlined} from '@ant-design/icons';
import type {MenuProps} from 'antd';
import {Button, Checkbox, Dropdown} from 'antd';

interface ColumnOption {
    key: string;
    label: string;
    required?: boolean;
}

interface ColumnCustomizerProps {
    columns: ColumnOption[];
    visibleColumns: string[];
    onChange: (columns: string[]) => void;
}

export default function ColumnCustomizer({
                                             columns,
                                             visibleColumns,
                                             onChange,
                                         }: ColumnCustomizerProps) {
    const items: MenuProps['items'] = columns.map(column => ({
        key: column.key,
        label: (
            <Checkbox
                checked={visibleColumns.includes(column.key)}
                disabled={column.required}
                onChange={(e) => {
                    const newColumns = e.target.checked
                        ? [...visibleColumns, column.key]
                        : visibleColumns.filter(key => key !== column.key);
                    onChange(newColumns);
                }}
            >
                {column.label}
            </Checkbox>
        ),
    }));

    return (
        <Dropdown
            menu={{items}}
            trigger={['click']}
            placement="bottomRight"
        >
            <Button icon={<SettingOutlined/>}>
                Columns
            </Button>
        </Dropdown>
    );
}
