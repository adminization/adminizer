import type {UserAP} from "./UserAP";

export interface GroupAP {
  id?: number;
  name: string;
  description?: string;
  tokens?: string[];
  users?: UserAP[];
}
