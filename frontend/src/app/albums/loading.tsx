import TableLoadingSkeleton from '@/components/common/feedback/TableLoadingSkeleton';

export default function AlbumsLoading() {
    return (
        <div className="p-4">
            <TableLoadingSkeleton rows={10} columns={6} />
        </div>
    );
}
