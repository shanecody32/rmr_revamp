'use client'

import {PlusOutlined} from '@ant-design/icons';
import {Input, InputRef, Tag} from 'antd';
import {useCallback, useEffect, useRef, useState} from 'react';

export interface TagsInputProps {
    value?: string[];
    onChange?: (value: string[]) => void;
    maxTags?: number;
    maxLength?: number;
    disabled?: boolean;
    placeholder?: string;
    validateTag?: (tag: string) => boolean;
    colorMap?: Record<string, string>;
}

export const TagsInput: React.FC<TagsInputProps> = ({
                                                        value = [],
                                                        onChange,
                                                        maxTags = Infinity,
                                                        maxLength = 20,
                                                        disabled = false,
                                                        placeholder = 'Add tag',
                                                        validateTag,
                                                        colorMap = {},
                                                    }) => {
    const [tags, setTags] = useState<string[]>(value);
    const [inputValue, setInputValue] = useState('');
    const [inputVisible, setInputVisible] = useState(false);
    const inputRef = useRef<InputRef>(null);

    // Only update internal state when prop value changes
    useEffect(() => {
        if (JSON.stringify(value) !== JSON.stringify(tags)) {
            setTags(value);
        }
    }, [value, tags]);

    useEffect(() => {
        if (inputVisible) {
            inputRef.current?.focus();
        }
    }, [inputVisible]);

    const handleClose = useCallback((removedTag: string) => {
        const newTags = tags.filter(tag => tag !== removedTag);
        setTags(newTags);
        onChange?.(newTags);
    }, [tags, onChange]);

    const handleInputConfirm = useCallback(() => {
        if (inputValue && tags.length < maxTags) {
            const trimmedValue = inputValue.trim();

            // Validate tag if validator is provided
            if (validateTag && !validateTag(trimmedValue)) {
                return;
            }

            // Add tag if it doesn't exist
            if (!tags.includes(trimmedValue)) {
                const newTags = [...tags, trimmedValue];
                setTags(newTags);
                onChange?.(newTags);
            }
        }
        setInputValue('');
        setInputVisible(false);
    }, [inputValue, tags, maxTags, validateTag, onChange]);

    const getTagColor = useCallback((tag: string) => {
        if (tag in colorMap) {
            return colorMap[tag];
        }
        const hash = tag.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 70%, 50%)`;
    }, [colorMap]);

    return (
        <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
                const tagColor = getTagColor(tag);

                return (
                    <Tag
                        key={tag}
                        closable={!disabled}
                        onClose={() => handleClose(tag)}
                        color={tagColor}
                    >
                        {tag}
                    </Tag>
                );
            })}

            {inputVisible ? (
                <Input
                    ref={inputRef}
                    type="text"
                    size="small"
                    className="w-24"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onBlur={handleInputConfirm}
                    onPressEnter={handleInputConfirm}
                    maxLength={maxLength}
                    disabled={disabled}
                />
            ) : (
                tags.length < maxTags && !disabled && (
                    <Tag
                        className="border-dashed cursor-pointer"
                        onClick={() => setInputVisible(true)}
                    >
                        <PlusOutlined/> {placeholder}
                    </Tag>
                )
            )}
        </div>
    );
};
