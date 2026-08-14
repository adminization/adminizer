import { Group } from "../models/Group";
import { User } from "../models/User";
import {AccessRightsToken, ModelResource, PropsField} from "../interfaces/types";
import {parseGroupPermissionGrant} from "./accessRightsHelper";



interface groupedTokens {
    header: string,
    fields: PropsField[]
}

interface listProps extends Record<string | number | symbol, unknown>{
    edit: boolean;
    view: boolean;
    btnBack: {
        title: string;
        link: string;
    },
    btnSave: {
        title: string;
    },
    postLink: string,
    head: string,
    userHead: string,
    fields: PropsField[],
    users: PropsField[]
    groupedTokens: groupedTokens[]
}

export function inertiaGroupHelper(
    modelResource: ModelResource, req: ReqType, users: User[],
    groupedTokens: {
        [key: string]: AccessRightsToken[]
    },
    group?: Group, view: boolean = false) {
    let props: listProps = {
        edit: !!group,
        view: view,
        btnBack: {
            title: req.i18n.__('Back'),
            link: modelResource.uri
        },
        btnSave: {
            title: req.i18n.__('Save')
        },
        postLink: group ? `${modelResource.uri}/edit/${group.id}` : `${modelResource.uri}/add`,
        head: req.i18n.__('Group settings'),
        userHead: '',
        fields: [
            {
                label: req.i18n.__('Group name'),
                type: 'text',
                name: 'name',
                value: group?.name ?? ''
            },
            {
                label: req.i18n.__('Group description'),
                type: 'text',
                name: 'description',
                value: group?.description ?? ''
            },
        ],
        users: [],
        groupedTokens: []
    }
    if (users?.length) {
        props.userHead = req.i18n.__('Members')
        for (const user of users) {
            let userGroupsIds: number[] = []
            if (user.groups && user.groups.length) {
                userGroupsIds = user.groups.map((group) => {
                    return group.id
                })
            }
            props.users.push({
                label: user.fullName,
                type: 'checkbox',
                name: `user-checkbox-${user.id}`,
                value: group ? userGroupsIds.includes(group.id) : false
            })
        }
    }
    if (Object.keys(groupedTokens).length) {
        for (let [department, tokens] of Object.entries(groupedTokens)) {
            let header = department
            let fields: PropsField[] = []
            for (let token of tokens) {
                fields.push({
                    label: token.name,
                    tooltip: token.description,
                    name: `token-checkbox-${token.id}`,
                    value: group ? Boolean(group.tokens?.some((value) =>
                        value === token.id || parseGroupPermissionGrant(value)?.tokenId === token.id
                    )) : false,
                    type: 'checkbox',
                    options: token.getOptions ? {
                        permissionOptions: {
                            rights: group?.tokens
                                ?.map(parseGroupPermissionGrant)
                                .find((value) => value?.tokenId === token.id)?.rights ?? [],
                        },
                    } : undefined,
                })
            }
            props.groupedTokens.push({
                header: header,
                fields: fields
            })
        }
    }
    return props
}


