import {useMemo, useState} from "react";
import HandsonTable from "@/js-components/handsontable";

type TableRow = {
    feature: string;
    status: string;
    value: number;
};

const initialRows: TableRow[] = [
    {feature: "window.JSComponents", status: "loaded", value: 1},
    {feature: "HandsonTable", status: "rendered", value: 2},
    {feature: "production asset", status: "checked", value: 3},
];

export default function HandsontableTest() {
    const [rows, setRows] = useState<TableRow[]>(initialRows);
    const options = useMemo(() => ({
        colHeaders: ["Feature", "Status", "Value"],
        columns: [
            {data: "feature", type: "text"},
            {data: "status", type: "text"},
            {data: "value", type: "numeric"},
        ],
        rowHeaders: true,
        stretchH: "all",
        height: 320,
        width: "100%",
        licenseKey: "non-commercial-and-evaluation",
    }), []);

    return (
        <section className="space-y-4">
            <div>
                <h1 className="text-xl font-semibold">Handsontable Test</h1>
                <p className="text-sm text-muted-foreground">
                    Source: @/js-components/handsontable
                </p>
            </div>

            <HandsonTable
                data={rows}
                config={options}
                onChange={setRows}
            />
        </section>
    );
}
