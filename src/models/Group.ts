import type {User} from "./User";
import type {PermissionGrant} from "../interfaces/types";

export interface Group {
  id?: number;
  name: string;
  description?: string;
  tokens?: PermissionGrant[];
  users?: User[];
}
