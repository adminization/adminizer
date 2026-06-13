import type {MediaManagerAssociationsAP} from "./MediaManagerAssociationsAP";
import type {MediaManagerMetaAP} from "./MediaManagerMetaAP";

export interface MediaManagerAP {
    id: string;
    parent?: MediaManagerAP;
    variants?: MediaManagerAP[];
    mimeType?: string;
    path?: string;
    size?: number;
    group?: string;
    tag?: string;
    url?: string;
    filename?: string;
    meta?: MediaManagerMetaAP[];
    modelAssociation?: MediaManagerAssociationsAP[];
}
