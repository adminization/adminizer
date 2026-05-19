export type CriteriaPrimitive = string | number | boolean | Date | null;

export type CriteriaSortDirection = "ASC" | "DESC" | "asc" | "desc";

export type CriteriaSelect = string[] | Record<string, boolean>;

export type CriteriaSort = string | Record<string, CriteriaSortDirection>;

export interface CriteriaOperatorValue {
    eq?: unknown;
    ne?: unknown;
    gt?: unknown;
    gte?: unknown;
    lt?: unknown;
    lte?: unknown;
    contains?: unknown;
    startsWith?: unknown;
    endsWith?: unknown;
    in?: unknown[];
    notIn?: unknown[];
    between?: [unknown, unknown];
    isNull?: boolean;
    isNotNull?: boolean;
    regex?: unknown;
    arrayContains?: unknown;
    arrayOverlap?: unknown[];
    jsonContains?: unknown;
}

export type CriteriaFieldValue =
    | CriteriaPrimitive
    | CriteriaPrimitive[]
    | CriteriaOperatorValue;

export interface CriteriaWhere {
    and?: CriteriaWhere[];
    or?: CriteriaWhere[];
    not?: CriteriaWhere;
    [field: string]: CriteriaFieldValue | CriteriaWhere | CriteriaWhere[] | undefined;
}

export type CriteriaPopulate = Record<string, true | QueryCriteria>;

export interface QueryCriteria {
    where?: CriteriaWhere;
    select?: CriteriaSelect;
    populate?: CriteriaPopulate;
    sort?: CriteriaSort;
    limit?: number;
    skip?: number;
}
