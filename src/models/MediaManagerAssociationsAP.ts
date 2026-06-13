import type {MediaManagerAP} from "./MediaManagerAP";

export interface MediaManagerAssociationsAP {
    id: string;
    mediaManagerId?: string;
    model?: string;
    modelId?: string;
    widgetName?: string;
    sortOrder?: number;
    file?: MediaManagerAP;
}
