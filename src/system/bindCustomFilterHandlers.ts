import { Adminizer } from "../lib/Adminizer";
import { FilterCustomFieldHandler } from "../lib/filters/FilterCustomFieldHandler";

export default function bindCustomFilterHandlers(adminizer: Adminizer): void {
    adminizer.filterCustomFieldHandler = new FilterCustomFieldHandler();
}
