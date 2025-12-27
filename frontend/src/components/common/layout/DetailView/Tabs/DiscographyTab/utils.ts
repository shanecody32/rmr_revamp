export function formatTrackDuration(length: number): string {
    const minutes = Math.floor(length / 60000);
    const seconds = Math.floor((length % 60000) / 1000);
    return `(${minutes}:${String(seconds).padStart(2, '0')})`;
}