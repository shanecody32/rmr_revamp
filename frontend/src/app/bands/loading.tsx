import TableLoadingSkeleton from '@/components/common/feedback/TableLoadingSkeleton';

export default function BandsLoading() {
    return (
        <div className="p-4">
            <TableLoadingSkeleton rows={10} columns={6} />
        </div>
    );
}
