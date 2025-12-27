import clsx, {type ClassValue} from 'clsx';
import {format} from 'date-fns';
import {twMerge} from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    
    try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '-';
        return format(dateObj, 'MMM d, yyyy h:mm a');
    } catch (error) {
        console.warn('Invalid date format:', date, error);
        return '-';
    }
}
