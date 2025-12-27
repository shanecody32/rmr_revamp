'use client'

import {Form} from 'antd';
import {useEffect, useRef, useState} from 'react';

import GenreTypeaheadRefactored from '@/components/common/typeahead/GenreTypeaheadRefactored';
import SubGenreTypeaheadRefactored from '@/components/common/typeahead/SubGenreTypeaheadRefactored';
import type {GenreResponse, SubGenreResponse} from '@/types/api/locations';

interface GenreFilterProps {
    form: any; // Form instance from parent
}

export default function GenreFilterRefactored({form}: GenreFilterProps) {
    const [selectedGenre, setSelectedGenre] = useState<GenreResponse>();
    const [selectedSubGenre, setSelectedSubGenre] = useState<SubGenreResponse>();
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const handleGenreChange = (value: number | undefined, genre: GenreResponse | undefined) => {
        if (!mounted.current) return;

        setSelectedGenre(genre);
        setSelectedSubGenre(undefined);

        // Clear dependent field in form
        form.setFieldsValue({
            sub_genre_id: undefined
        });
    };

    const handleSubGenreChange = (value: number | undefined, subGenre: SubGenreResponse | undefined) => {
        if (!mounted.current) return;
        setSelectedSubGenre(subGenre);
    };

    return (
        <>
            <Form.Item name="genre_id" label="Genre">
                <GenreTypeaheadRefactored
                    onChange={handleGenreChange}
                    onClear={() => {
                        if (mounted.current) {
                            setSelectedGenre(undefined);
                            setSelectedSubGenre(undefined);
                            form.setFieldsValue({
                                sub_genre_id: undefined
                            });
                        }
                    }}
                />
            </Form.Item>

            <Form.Item name="sub_genre_id" label="Sub-Genre">
                <SubGenreTypeaheadRefactored
                    genreId={selectedGenre?.id}
                    onChange={handleSubGenreChange}
                    onClear={() => {
                        if (mounted.current) {
                            setSelectedSubGenre(undefined);
                        }
                    }}
                />
            </Form.Item>
        </>
    );
}
