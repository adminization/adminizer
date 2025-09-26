import {AbstractModel} from "../lib/model/AbstractModel";
import {ModelConfig} from "./adminpanelConfig";
import {Inertia} from '../lib/inertia/inertiaAdapter';
import {Flash} from '../lib/inertia/flash';
import {Adminizer} from "../lib/Adminizer";
import multer from "multer";
import {I18n} from "../lib/I18n";

export type EntityType = "form" | "model";

export interface Entity {
    name: string
    config?: ModelConfig
    model?: AbstractModel<any>
    uri: string
    type: EntityType
}

export interface AccessRightsToken {
    name: string
    description: string
    department: string
    id: string
}

export interface PropsField {
    label: string;
    type: string;
    name: string;
    tooltip?: string;
    value: string | boolean | number | string[];
    disabled?: boolean;
    required?: boolean;
    isIn?: string[] | number[] | boolean[];
    options?: Record<string, any> | Record<string, any>[]
}

export interface DiffChanges {
    field: string;
    oldValue: any;
    newValue: any;
    type: string;
}

export interface Diff {
    changes: DiffChanges[]
    summary: string
}

export interface INotification {
    id: string;
    title: string;
    message: string;
    createdAt: Date;
    userId?: number;
    read?: boolean;
    icon: {
        icon: string;
        iconColor: string;
    }
    notificationClass: string; // Класс нотификации: 'general', 'system', etc.
    channel: string | 'created' | 'updated' | 'deleted' | 'system';
    metadata?: Record<string | number, any> | Diff;
}

export interface INotificationEvent {
    type: 'notification' | 'heartbeat' | 'connected' | 'error';
    data: INotification | string;
    notificationClass?: string;
    channel?: string
    userId?: number;
}

export type AiAssistantRole = 'user' | 'assistant';

export interface AiAssistantMessage {
    id: string;
    role: AiAssistantRole;
    content: string;
    timestamp: Date;
    modelId: string;
}

export interface AiAssistantModelInfo {
    id: string;
    name: string;
    description?: string;
}

export type Migration = {
  name: string;
  timestamp: number,
  up: (args: { context: any }) => Promise<unknown> | unknown;
  down: (args: { context: any }) => Promise<unknown> | unknown;
};