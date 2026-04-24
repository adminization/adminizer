import { Adminizer } from "../lib/Adminizer";
import { CustomFilterHandler } from "../lib/filters/CustomFilterHandler";

export default function bindCustomFilterHandlers(adminizer: Adminizer): void {
    adminizer.customFilterHandler = new CustomFilterHandler();
}
