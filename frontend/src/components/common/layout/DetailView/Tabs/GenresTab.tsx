import {Tag} from "antd";

import type {BandResponse} from '@/types/api/bands';

interface GenresTabProps {
    data: BandResponse;
}

export default function GenresTab({data}: GenresTabProps) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium mb-3">Genres</h3>
                <div className="flex flex-wrap gap-2">
                    {data.genres?.map(genre => (
                        <Tag key={genre.id} color="blue">
                            {genre.name}
                        </Tag>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-lg font-medium mb-3">Sub-Genres</h3>
                <div className="flex flex-wrap gap-2">
                    {data.sub_genres?.map(subGenre => (
                        <Tag key={subGenre.id} color="purple">
                            {subGenre.name}
                        </Tag>
                    ))}
                </div>
            </div>
        </div>
    );
}