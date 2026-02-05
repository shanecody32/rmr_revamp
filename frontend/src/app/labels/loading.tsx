import TableLoadingSkeleton from '@/components/common/feedback/TableLoadingSkeleton';

export default function LabelsLoading() {
    return (
        <div className="p-4">
            <TableLoadingSkeleton rows={10} columns={5} />
        </div>
    );
}
