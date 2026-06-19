import type {WidgetConfig, WidgetsLayouts} from "../lib/widgets/widgetHandler";
import type {Group} from "./Group";

export interface User {
  id?: number;
  login: string;
  fullName?: string;
  email?: string;
  avatar?: string;
  passwordHashed?: string;
  timezone?: string;
  expires?: string;
  locale?: string;
  isDeleted?: boolean;
  isActive?: boolean;
  isAdministrator?: boolean;
  groups?: Group[];
  widgets?: {
      widgets: WidgetConfig[],
      layout: WidgetsLayouts
  };
  isConfirmed?: boolean;
  apiKey?: string;
}
