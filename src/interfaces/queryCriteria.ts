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
    | null
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

export type IsAny<T> = 0 extends 1 & T ? true : false;

export type CriteriaWhere<TModel = any> = IsAny<TModel> extends true
    ? CriteriaWhereLogic<TModel> & { [field: string]: unknown }
    : CriteriaWhereLogic<TModel> & CriteriaKnownFields<TModel>;

type PopulatableElement<T> = NonNullable<T> extends Array<infer Item>
    ? Item
    : NonNullable<T>;

type PopulatableKeys<TModel> = {
    [K in keyof TModel]-?: NonNullable<TModel[K]> extends string | number | boolean | Date
        ? never
        : K;
}[keyof TModel];

export type CriteriaPopulate<TModel = any> = IsAny<TModel> extends true
    ? Record<string, true | QueryCriteria<any>>
    : {
        [K in Extract<PopulatableKeys<TModel>, string>]?: true | QueryCriteria<PopulatableElement<TModel[K]>>;
    };

export interface QueryCriteria<TModel = any> {
    where?: CriteriaWhere<TModel>;
    select?: CriteriaSelect;
    populate?: CriteriaPopulate<TModel>;
    /**
     * Record-access confinement of single populated associations, keyed by association
     * name and ANDed into the populate JOIN's ON clause: a populated record failing the
     * condition arrives as its bare foreign-key value instead of an object, while the
     * owning row itself stays in the result — unlike `populate.<field>.where`, which
     * confines the owning rows.
     *
     * Set exclusively by `DataAccessor.pushDownPopulateAccess` for the associations the
     * adapter declared pushdown-capable (`AbstractModel.canPushdownPopulateAccess`);
     * `sanitizeUserRelationAccess` discards an incoming value, so hand-built criteria
     * cannot suppress the association verification that trusts this key.
     */
    populateOn?: Record<string, CriteriaWhere>;
    sort?: CriteriaSort;
    limit?: number;
    skip?: number;
}
