import TableLoadingSkeleton from '@/components/common/feedback/TableLoadingSkeleton';

export default function RadioStationsLoading() {
    return (
        <div className="p-4">
            <TableLoadingSkeleton rows={10} columns={5} />
        </div>
    );
}
