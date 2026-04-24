import { FilterCondition } from "../models/FilterAP";

export interface ConvertDatetimeConditionsOptions {
    dropEmptyValues?: boolean;
}

const DATETIME_LOCAL_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const OPERATORS_WITHOUT_VALUE: Array<FilterCondition['operator']> = ['isNull', 'isNotNull', 'today'];

function isOperatorWithoutValue(operator?: FilterCondition['operator']): boolean {
    return operator !== undefined && OPERATORS_WITHOUT_VALUE.includes(operator);
}

function parseDatetimeLocalToUtc(value: string): Date | null {
    if (!DATETIME_LOCAL_REGEX.test(value)) {
        return null;
    }

    const [datePart, timePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);

    if ([year, month, day, hours, minutes].some(Number.isNaN)) {
        return null;
    }

    return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
}

export function convertDatetimeConditions(
    conditions: FilterCondition[] | undefined,
    options: ConvertDatetimeConditionsOptions = {}
): FilterCondition[] {
    if (!conditions || !Array.isArray(conditions)) {
        return [];
    }

    const { dropEmptyValues = false } = options;

    return conditions
        .filter(cond => {
            if (!dropEmptyValues) {
                return true;
            }

            if (isOperatorWithoutValue(cond.operator)) {
                return true;
            }

            if (cond.value === undefined || cond.value === null || cond.value === '') {
                return false;
            }

            if (Array.isArray(cond.value) && cond.value.length === 0) {
                return false;
            }

            return true;
        })
        .map(cond => {
            if (cond.children && cond.children.length > 0) {
                return {
                    ...cond,
                    children: convertDatetimeConditions(cond.children, options)
                };
            }

            if (!cond.field || cond.value === undefined || cond.value === null || cond.value === '') {
                return cond;
            }

            if (isOperatorWithoutValue(cond.operator)) {
                return cond;
            }

            if (typeof cond.value === 'string') {
                const utcDate = parseDatetimeLocalToUtc(cond.value);

                if (utcDate) {
                    if (cond.operator === 'eq') {
                        const endOfMinute = new Date(utcDate.getTime() + 59_999);
                        return {
                            ...cond,
                            operator: 'between',
                            value: [utcDate, endOfMinute]
                        };
                    }

                    return {
                        ...cond,
                        value: utcDate
                    };
                }
            }

            if (Array.isArray(cond.value) && cond.value.length === 2) {
                const [val1, val2] = cond.value;

                if (typeof val1 === 'string' && typeof val2 === 'string') {
                    const utcDate1 = parseDatetimeLocalToUtc(val1);
                    const utcDate2 = parseDatetimeLocalToUtc(val2);

                    if (utcDate1 && utcDate2) {
                        return {
                            ...cond,
                            value: [utcDate1, utcDate2]
                        };
                    }
                }
            }

            return cond;
        });
}
