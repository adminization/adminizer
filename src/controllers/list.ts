import {ControllerHelper} from "../helpers/controllerHelper";
import {DataAccessor} from "../lib/DataAccessor";
import {Column, NodeTable} from "../lib/datatable/NodeTable";
import {Adminizer} from "../lib/Adminizer";
import {NodeOutput} from "../lib/datatable/NodeTable";
import {inertiaListHelper} from "../helpers/inertiaListHelper";
import {Field, Fields} from "../helpers/fieldsHelper";
import {BaseFieldConfig} from "../interfaces/adminpanelConfig";
import {redirectToLogin} from '../helpers/inertiaAutHelper';

export default async function list(req: ReqType, res: ResType) {
    let entity = ControllerHelper.findEntityObject(req);
    if (!entity.model) {
        return res.status(404).send({error: 'Not Found'});
    }

    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return redirectToLogin(req, res);
        } else if (!req.adminizer.accessRightsHelper.hasPermission(`read-${entity.name}-model`, req.user)) {
            return res.sendStatus(403);
        }
    }

    let dataAccessor = new DataAccessor(req.adminizer, req.user, entity, "list");
    let fields = dataAccessor.getFieldsConfig();
    const header = inertiaListHelper(entity, req, fields)
    let start = "0";
    if (req.query.page) {
        if (req.query.page === '1') {
            start = "0";
        } else {
            start = ((+req.query.page - 1) * +req.query.count).toString();
        }
    }
    const count = req.query.count ? req.query.count.toString() : "5"

    const orderColumn = req.query.column ? req.query.column.toString() : undefined // if no column is set, default to first column
    const direction = req.query.direction === "asc" ? 'asc' : "desc"

    const globalSearch = req.query.globalSearch ? req.query.globalSearch.toString() : ""

    const searchColumns = req.query.searchColumn
        ? Array.isArray(req.query.searchColumn)
            ? req.query.searchColumn.map(String)
            : [req.query.searchColumn.toString()]
        : [];

    const searchColumnValues = req.query.searchColumnValue
        ? Array.isArray(req.query.searchColumnValue)
            ? req.query.searchColumnValue.map(String)
            : [req.query.searchColumnValue.toString()]
        : [];

    // Collect {column, value} pairs, removing duplicate columns (leaving the latter)
    const searchMap = new Map<string, string>();

    for (let i = 0; i < searchColumns.length; i++) {
        const column = searchColumns[i];
        const value = searchColumnValues[i] || ""; 
        searchMap.set(column, value); 
    }

    const searchPairs = Array.from(searchMap.entries()).map(([column, value]) => ({
        column,
        value,
    }))

    const {columns, nodeTreeColumns} = setColumns(fields, orderColumn, direction, searchPairs, req)
    
    const RequestBody = {
        draw: "1",
        start: start,
        length: count,
        order: [
            {
                column: orderColumn,
                dir: direction
            }
        ],
        columns: [
            {
                data: "0",          // actions column
                searchable: "true",
                orderable: "true",
                search: {value: "", regex: false}
            },
            ...nodeTreeColumns
        ],
        search: {value: globalSearch, regex: false}
    };

    
    const nodeTable = new NodeTable(RequestBody, entity.model, fields);
    await nodeTable.output((err: Error, data: NodeOutput) => {
        if (err) {
            Adminizer.log.error(err);
        }
        return req.Inertia.render({
            component: 'list',
            props: {
                header: header,
                columns: columns,
                data: data ?? [],
            }
        });
    }, dataAccessor);
}

function setColumns(
    fields: Fields,
    orderColumn: string,
    direction: string,
    searchPairs: Array<{ column: string; value: string }>,
    req: ReqType
) {
    const columns: Record<string, object> = {};
    const nodeTreeColumns: Column[] = [];
    let i = 1;

    for (const key of Object.keys(fields)) {
        const field = fields[key] as Field;

        // Check if this field is searchable
        const searchForThisColumn = searchPairs.find(pair => pair.column === String(i));
        const searchValue = searchForThisColumn ? searchForThisColumn.value : "";
        columns[key] = {
            ...field.config as BaseFieldConfig,
            title: req.i18n.__((field.config as BaseFieldConfig).title),
            data: String(i),
            direction: String(i) === orderColumn ? direction : undefined,
            searchColumnValue: searchValue || undefined, // undefined if there is no search
        };
        
        
        
        nodeTreeColumns.push({
            data: String(i),
            searchable: 'true',
            orderable: 'true',
            search: {
                value: searchValue,
                regex: false,
            },
        });

        i++;
    }

    return { columns, nodeTreeColumns };
}
