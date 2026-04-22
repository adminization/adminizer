import { useState } from 'react';
import { Badge } from '@/components/ui/badge.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Users, X } from 'lucide-react';
import { useFilterTranslations } from './use-filter-translations';

interface GroupVisibilitySelectorProps {
    groups: Array<{ id: number; name: string }>;
    selectedGroupIds: number[];
    onGroupsChange: (groupIds: number[]) => void;
    modelName?: string;
}

export function GroupVisibilitySelector({
    groups,
    selectedGroupIds,
    onGroupsChange,
    modelName
}: GroupVisibilitySelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useFilterTranslations(modelName || '');

    const toggleGroup = (groupId: number) => {
        if (selectedGroupIds.includes(groupId)) {
            onGroupsChange(selectedGroupIds.filter(id => id !== groupId));
        } else {
            onGroupsChange([...selectedGroupIds, groupId]);
        }
    };

    const getSelectedNames = () => {
        return groups
            .filter(g => selectedGroupIds.includes(g.id))
            .map(g => g.name);
    };

    if (groups.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{t('Access for groups')}</span>
            </div>

            {/* Выбранные группы */}
            {selectedGroupIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {getSelectedNames().map((name, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                            {name}
                            <button
                                type="button"
                                className="ml-1 hover:text-destructive"
                                onClick={() => {
                                    const group = groups.find(g => g.name === name);
                                    if (group) {
                                        toggleGroup(group.id);
                                    }
                                }}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            {/* Список групп с чекбоксами */}
            <div className="border rounded-lg p-3 space-y-2">
                {groups.map((group) => (
                    <div
                        key={group.id}
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => toggleGroup(group.id)}
                    >
                        <Checkbox
                            checked={selectedGroupIds.includes(group.id)}
                            onCheckedChange={() => toggleGroup(group.id)}
                        />
                        <div>
                            <div className="text-sm font-medium">{group.name}</div>
                            {group.description && (
                                <div className="text-xs text-muted-foreground">{group.description}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
