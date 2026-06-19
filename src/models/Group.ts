import type {User} from "./User";

export interface Group {
  id?: number;
  name: string;
  description?: string;
  tokens?: string[];
  users?: User[];
}
