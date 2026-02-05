import TableLoadingSkeleton from '@/components/common/feedback/TableLoadingSkeleton';

export default function SystemLoading() {
    return (
        <div className="p-4">
            <TableLoadingSkeleton rows={8} columns={4} />
        </div>
    );
}
