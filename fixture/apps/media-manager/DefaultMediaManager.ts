import {
    AbstractMediaManager,
    Adminizer,
    AppRuntime,
    File,
    MediaManagerItem,
    MediaManagerWidgetClientItem,
    MediaManagerWidgetData,
    QueryCriteria,
    SortCriteria,
} from "../../../dist";
import {ApplicationItem, ImageItem, TextItem, VideoItem} from "./Items";
import {mediaManagerModelNames} from "./MediaManagerModels";
import type {MediaManagerAssociationRecord} from "./MediaManagerTypes";
import {populateVariants} from "../../../dist/lib/media-manager/helpers/MediaManagerHelper";

export class DefaultMediaManager extends AbstractMediaManager {
    readonly itemTypes: File<MediaManagerItem>[] = [];
    readonly id: string;
    declare readonly urlPathPrefix: string;
    declare readonly fileStoragePath: string;

    constructor(
        private readonly runtime: AppRuntime,
        id: string,
        urlPathPrefix: string,
        fileStoragePath: string,
        imageSizes: Record<string, {width: number; height: number}>
    ) {
        super(createLegacyMediaManagerHost());
        this.id = id;
        this.urlPathPrefix = urlPathPrefix;
        this.fileStoragePath = fileStoragePath;
        this.itemTypes.push(new ImageItem(runtime, urlPathPrefix, fileStoragePath, imageSizes));
        this.itemTypes.push(new TextItem(runtime, urlPathPrefix, fileStoragePath));
        this.itemTypes.push(new ApplicationItem(runtime, urlPathPrefix, fileStoragePath));
        this.itemTypes.push(new VideoItem(runtime, urlPathPrefix, fileStoragePath));
    }

    async getAll(limit: number, skip: number, sort: SortCriteria, group?: string) {
        const media = this.runtime.models.get<MediaManagerItem>(mediaManagerModelNames.media);
        const where: QueryCriteria<MediaManagerItem>["where"] = {parent: null, group};
        const data = await media.find({
            where,
            limit,
            skip,
            sort,
            populate: {variants: {sort}, meta: true},
        });
        for (const item of data) {
            item.variants = await populateVariants(
                this.runtime,
                item.variants ?? [],
                mediaManagerModelNames.media
            );
        }
        const next = await media.find({where, limit, skip: skip + limit, sort});
        return {data, next: next.length > 0};
    }

    async searchAll(search: string, group?: string): Promise<MediaManagerItem[]> {
        const data = await this.runtime.models
            .get<MediaManagerItem>(mediaManagerModelNames.media)
            .find({
                where: {filename: {contains: search}, parent: null, group},
                sort: "createdAt DESC",
                limit: 1000,
                populate: {variants: {sort: "createdAt DESC"}, meta: true},
            });
        for (const item of data) {
            item.variants = await populateVariants(
                this.runtime,
                item.variants ?? [],
                mediaManagerModelNames.media
            );
        }
        return data;
    }

    async setRelations(
        data: MediaManagerWidgetData[],
        model: string,
        modelId: string | number,
        widgetName: string
    ): Promise<void> {
        if (modelId == null) {
            throw new Error("modelId must be a string or number");
        }

        const associations = this.runtime.models.get<MediaManagerAssociationRecord>(
            mediaManagerModelNames.associations
        );
        const where = {
            modelId: String(modelId),
            model: model.toLowerCase(),
            widgetName,
        };
        for (const association of await associations.find({where})) {
            await associations.destroy({where: {id: association.id}});
        }
        for (const [index, item] of data.entries()) {
            await associations.create({
                mediaManagerId: this.id,
                model: model.toLowerCase(),
                modelId: String(modelId),
                file: item.id,
                widgetName,
                sortOrder: index + 1,
            });
        }
    }

    async getRelations(
        model: string,
        widgetName: string,
        modelId: string | number
    ): Promise<MediaManagerWidgetClientItem[]> {
        if (modelId == null) {
            throw new Error("modelId must be a string or number");
        }

        const files = await this.runtime.models.get<MediaManagerAssociationRecord>(
            mediaManagerModelNames.associations
        ).find({
            where: {
                model: model.toLowerCase(),
                widgetName,
                modelId: String(modelId),
            },
            sort: "sortOrder ASC",
            populate: {file: true},
        });

        return files
            .filter((association) => association.file)
            .map((association) => ({
                id: association.file.id,
                mimeType: association.file.mimeType,
                filename: association.file.filename,
                url: association.file.url,
                variants: [] as MediaManagerItem[],
            }));
    }
}

function createLegacyMediaManagerHost(): Adminizer {
    return {
        accessRightsHelper: {
            registerToken: (): void => undefined,
        },
    } as unknown as Adminizer;
}
