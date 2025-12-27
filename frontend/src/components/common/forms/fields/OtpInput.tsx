'use client'

import type {InputRef} from 'antd';
import {Input, Space} from 'antd';
import {useEffect, useRef, useState} from 'react';

export interface OtpInputProps {
    value?: string;
    onChange?: (value: string) => void;
    length?: number;
    disabled?: boolean;
    autoFocus?: boolean;
    type?: 'text' | 'number';
    className?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
                                                      value = '',
                                                      onChange,
                                                      length = 6,
                                                      disabled = false,
                                                      autoFocus = true,
                                                      type = 'text',
                                                      className = '',
                                                  }) => {
    const [otp, setOtp] = useState<string[]>(value.split('').slice(0, length));
    const inputRefs = useRef<(InputRef | null)[]>([]);

    useEffect(() => {
        // Initialize refs array
        inputRefs.current = inputRefs.current.slice(0, length);

        // Focus first input on mount if autoFocus is true
        if (autoFocus && inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [length, autoFocus]);

    useEffect(() => {
        // Update OTP when value prop changes
        setOtp(value.split('').slice(0, length));
    }, [value, length]);

    const handleChange = (index: number, inputValue: string) => {
        const newValue = inputValue.slice(-1); // Only keep the last character
        const newOtp = [...otp];
        newOtp[index] = newValue;

        setOtp(newOtp);
        onChange?.(newOtp.join(''));

        // Move to next input if value is entered
        if (newValue && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            // Move to previous input on backspace if current input is empty
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, length);
        const newOtp = [...otp];

        pastedData.split('').forEach((char, index) => {
            if (index < length) {
                newOtp[index] = char;
            }
        });

        setOtp(newOtp);
        onChange?.(newOtp.join(''));

        // Focus last filled input or first empty input
        const lastIndex = Math.min(pastedData.length, length) - 1;
        if (lastIndex >= 0) {
            inputRefs.current[lastIndex]?.focus();
        }
    };

    return (
        <Space size="small" className={className}>
            {Array(length).fill(null).map((_, index) => (
                <Input
                    key={index}
                    ref={el => {
                        inputRefs.current[index] = el;
                    }}
                    value={otp[index] || ''}
                    onChange={e => handleChange(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    type={type}
                    className="w-12 h-12 text-center text-lg"
                    maxLength={1}
                />
            ))}
        </Space>
    );
};
