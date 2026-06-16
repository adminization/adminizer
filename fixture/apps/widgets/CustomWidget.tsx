import {useState} from "react";
import {Button} from "@/components/ui/button";

export default function CustomWidget() {
    const [count, setCount] = useState(0);

    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-neutral-900">
            <div className="text-sm font-medium uppercase tracking-normal text-neutral-600">App counter</div>
            <div className="text-4xl font-bold tabular-nums">{count}</div>
            <Button type="button" size="sm" onClick={() => setCount((value) => value + 1)}>
                Increment
            </Button>
        </div>
    );
}
