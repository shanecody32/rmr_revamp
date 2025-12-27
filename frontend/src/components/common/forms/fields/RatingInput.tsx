'use client'

import type {RateProps} from 'antd';
import {Rate} from 'antd';

export interface RatingInputProps extends RateProps {
    maxRating?: number;
    allowHalf?: boolean;
}

export const RatingInput: React.FC<RatingInputProps> = ({
                                                            maxRating = 5,
                                                            allowHalf = true,
                                                            ...props
                                                        }) => {
    return (
        <Rate
            count={maxRating}
            allowHalf={allowHalf}
            {...props}
        />
    );
};