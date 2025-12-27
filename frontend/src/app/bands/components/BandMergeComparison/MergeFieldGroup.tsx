'use client'

import React from 'react';

import MergeField from './MergeField';
import type {BandComparisonItem, FieldGroup, MergeFieldValue} from './types';

interface MergeFieldGroupProps {
    fieldGroup: FieldGroup;
    allBands: BandComparisonItem[];
    originalBandId: number;
    selectedValues: Record<string, MergeFieldValue>;
    onSelectValue: (fieldKey: string, value: any, sourceId: number) => void;
    renderSpecialField?: (field: string, band: BandComparisonItem) => React.ReactNode;
}

export default function MergeFieldGroup({
                                            fieldGroup,
                                            allBands,
                                            originalBandId,
                                            selectedValues,
                                            onSelectValue,
                                            renderSpecialField
                                        }: MergeFieldGroupProps) {
    return (
        <div>
            {fieldGroup.fields
                .filter(field => !field.hidden)
                .map(field => {
                    // Determine which band is currently selected for this field
                    let selectedSourceId = null;

                    // Handle special fields
                    if (field.special === 'location') {
                        // Use country_id to determine which band's location is selected
                        selectedSourceId = selectedValues.country_id?.sourceId;
                    } else {
                        // Normal fields
                        selectedSourceId = selectedValues[field.key]?.sourceId;
                    }

                    return (
                        <MergeField
                            key={field.key}
                            field={field}
                            allBands={allBands}
                            originalBandId={originalBandId}
                            selectedSourceId={selectedSourceId}
                            onSelectValue={onSelectValue}
                            renderSpecialField={renderSpecialField}
                        />
                    );
                })}
        </div>
    );
}