'use client'

import {MinusCircleOutlined, PlusOutlined} from '@ant-design/icons';
import {Button} from 'antd';
import {useCallback, useEffect, useState} from 'react';

export interface DynamicInputProps {
    value?: any[];
    onChange?: (value: any[]) => void;
    renderItem: (index: number, remove: () => void) => React.ReactNode;
    addButtonText?: string;
    maxItems?: number;
    minItems?: number;
}

export const DynamicInput: React.FC<DynamicInputProps> = ({
                                                              value = [],
                                                              onChange,
                                                              renderItem,
                                                              addButtonText = 'Add Item',
                                                              maxItems = Infinity,
                                                              minItems = 0,
                                                          }) => {
    const [items, setItems] = useState<any[]>(value);

    // Only update internal state when prop value changes
    useEffect(() => {
        if (JSON.stringify(value) !== JSON.stringify(items)) {
            setItems(value);
        }
    }, [value, items]);

    const handleAdd = useCallback(() => {
        if (items.length < maxItems) {
            const newItems = [...items, undefined];
            setItems(newItems);
            onChange?.(newItems);
        }
    }, [items, maxItems, onChange]);

    const handleRemove = useCallback((index: number) => {
        if (items.length > minItems) {
            const newItems = items.filter((_, i) => i !== index);
            setItems(newItems);
            onChange?.(newItems);
        }
    }, [items, minItems, onChange]);

    return (
        <div className="space-y-4">
            {items.map((_, index) => (
                <div key={index} className="flex items-start gap-2">
                    <div className="flex-1">
                        {renderItem(index, () => handleRemove(index))}
                    </div>
                    {items.length > minItems && (
                        <Button
                            type="text"
                            icon={<MinusCircleOutlined/>}
                            onClick={() => handleRemove(index)}
                            className="mt-2"
                        />
                    )}
                </div>
            ))}

            {items.length < maxItems && (
                <Button
                    type="dashed"
                    onClick={handleAdd}
                    block
                    icon={<PlusOutlined/>}
                >
                    {addButtonText}
                </Button>
            )}
        </div>
    );
};
