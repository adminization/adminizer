export type CriteriaPrimitive = string | number | boolean | Date | null;

export type CriteriaSortDirection = "ASC" | "DESC" | "asc" | "desc";

export type CriteriaSelect = string[] | Record<string, boolean>;

export type CriteriaSort = string | Record<string, CriteriaSortDirection>;

export interface CriteriaOperatorValue<TValue = unknown> {
    eq?: TValue;
    ne?: TValue;
    gt?: TValue;
    gte?: TValue;
    lt?: TValue;
    lte?: TValue;
    contains?: TValue;
    startsWith?: TValue;
    endsWith?: TValue;
    in?: TValue[];
    notIn?: TValue[];
    between?: [TValue, TValue];
    isNull?: boolean;
    isNotNull?: boolean;
    regex?: unknown;
    arrayContains?: unknown;
    arrayOverlap?: unknown[];
    jsonContains?: unknown;
}

export type CriteriaFieldInput<TValue = unknown> =
    TValue extends Array<infer Item>
        ? Item | Item[] | TValue
        : TValue;

export type CriteriaFieldValue<TValue = unknown> =
    | CriteriaPrimitive
    | CriteriaPrimitive[]
    | CriteriaFieldInput<TValue>
    | CriteriaOperatorValue<CriteriaFieldInput<TValue>>;

export type CriteriaKnownFields<TModel = any> = {
    [Field in Extract<keyof TModel, string>]?: CriteriaFieldValue<TModel[Field]>;
};

export interface CriteriaWhereLogic<TModel = any> {
    and?: CriteriaWhere<TModel>[];
    or?: CriteriaWhere<TModel>[];
    not?: CriteriaWhere<TModel>;
}

export type CriteriaWhere<TModel = any> =
    CriteriaWhereLogic<TModel>
    & CriteriaKnownFields<TModel>
    & {
        [field: string]: CriteriaFieldValue | CriteriaWhere<TModel> | CriteriaWhere<TModel>[] | undefined;
    };

export type CriteriaPopulate<TModel = any> = Record<string, true | QueryCriteria<any>>;

export interface QueryCriteria<TModel = any> {
    where?: CriteriaWhere<TModel>;
    select?: CriteriaSelect;
    populate?: CriteriaPopulate<TModel>;
    sort?: CriteriaSort;
    limit?: number;
    skip?: number;
}
