import type {BaseEntity} from './common';

export interface RadioStationResponse extends BaseEntity {
    station_type: 'terrestrial' | 'internet';
    info: string;
    active: boolean;
    automatic: boolean;
    influence: number;
    no_show: boolean;
    imported_from_file: boolean;
    approved_by: number | null;
    verified_by: number | null;
}
