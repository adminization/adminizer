import {
    AbstractMediaManager,
    MediaManagerItem,
    File,
    MediaManagerWidgetItem,
    MediaManagerWidgetData,
    MediaManagerWidgetClientItem,
    SortCriteria,
} from "./AbstractMediaManager";
import { getAssociationFieldName, populateVariants } from "./helpers/MediaManagerHelper";
import { ApplicationItem, ImageItem, TextItem, VideoItem } from "./Items";
import { Adminizer } from "../Adminizer";
import { MediaManagerAssociationsAP } from "../../models/MediaManagerAssociationsAP";


export class DefaultMediaManager extends AbstractMediaManager {
    public readonly itemTypes: File<MediaManagerItem>[] = [];
    public model: string = "mediamanagerap";
    public modelAssoc: string = "mediamanagerassociationsap";
    id: string;
    protected readonly adminizer: Adminizer;

    constructor(adminizer: Adminizer, id: string, urlPathPrefix: string, fileStoragePath: string) {
        super(adminizer);
        this.id = id;
        this.urlPathPrefix = urlPathPrefix;
        this.fileStoragePath = fileStoragePath;
        this.itemTypes.push(new ImageItem(adminizer, urlPathPrefix, fileStoragePath));
        this.itemTypes.push(new TextItem(adminizer, urlPathPrefix, fileStoragePath));
        this.itemTypes.push(new ApplicationItem(adminizer, urlPathPrefix, fileStoragePath));
        this.itemTypes.push(new VideoItem(adminizer, urlPathPrefix, fileStoragePath));
        this.adminizer = adminizer;
    }

    private mediaModel() {
        return this.adminizer.modelHandler.internal("media-manager").get<MediaManagerItem>(this.model);
    }

    private associationModel() {
        return this.adminizer.modelHandler.internal("media-manager").get<any>(this.modelAssoc);
    }

    public async getAll(limit: number, skip: number, sort: SortCriteria, group: string): Promise<{
        data: MediaManagerItem[];
        next: boolean
    }> {
        let data: MediaManagerItem[] = await this.mediaModel().find({
            where: { parent: null, group: group },
            limit: limit,
            skip: skip,
            sort: sort,
            populate: {
                variants: {sort: sort},
                meta: true
            }
        })


        let next = await this.mediaModel().find({
            where: { parent: null, group: group },
            limit: limit,
            skip: skip === 0 ? limit : skip + limit,
            sort: sort,
        })

        for (let elem of data) {
            elem.variants = await populateVariants(this.adminizer, elem.variants, this.model)
        }

        return {
            data: data,
            next: !!next.length,
        };
    }

    public async searchAll(s: string, group: string): Promise<MediaManagerItem[]> {
        let data: MediaManagerItem[] = await this.mediaModel().find({
            where: { filename: { contains: s }, parent: null, group: group },
            sort: "createdAt DESC",
            // This limitation is made strictly, if your code solves this please make a PR
            limit: 1000,
            populate: {
                variants: {sort: "createdAt DESC"},
                meta: true
            }
        })


        for (let elem of data) {
            elem.variants = await populateVariants(this.adminizer, elem.variants, this.model)
        }

        return data;
    }

    public async setRelations(
        data: MediaManagerWidgetData[],
        model: string,
        modelId: string | number, //Updated
        widgetName: string
    ): Promise<void> {

        if (modelId == null) {
            throw new Error("modelId must be a string or number");
        }

        const modelIdStr = String(modelId); //Normalize to string

        const associationModel = this.associationModel();
        let modelAssociations = await associationModel.find({
            where: {
                modelId: modelIdStr,
                model: model.toLowerCase(),
                widgetName: widgetName,
            },
        });

        for (const modelAssociation of modelAssociations) {
            const q: Record<string, any> = {};
            const pk = this.adminizer.modelHandler.model.get(this.modelAssoc).primaryKey;
            q[pk] = modelAssociation.id;
            await associationModel.destroy({where: q});
        }

        const fieldName = this.adminizer.ormAdapters[0].ormType === 'sequelize' ? 'fileId' : 'file';

        for (const [key, widgetItem] of data.entries()) {
            await associationModel.create({
                mediaManagerId: this.id,
                model: model.toLowerCase(),
                modelId: modelIdStr, //Save as a string
                [fieldName]: widgetItem.id,
                widgetName: widgetName,
                sortOrder: key + 1,
            });
        }
    }

    public async getRelations(
        model: string,
        widgetName: string,
        modelId: string | number
    ): Promise<MediaManagerWidgetClientItem[]> {

        if (modelId == null) {
            throw new Error("modelId must be a string or number");
        }

        const modelIdStr = String(modelId); //Normalize to string

        let widgetItems: MediaManagerWidgetClientItem[] = [];

        const fieldName = this.adminizer.ormAdapters[0].ormType === 'sequelize' ? 'fileRef' : 'file';

        let files = await this.associationModel().find({
            where: {
                model: model.toLowerCase(),
                widgetName: widgetName,
                modelId: modelIdStr, //Search by string
            },
            sort: "sortOrder ASC",
            populate: {[fieldName]: true}
        });

        for (const file of files) {
            widgetItems.push({
                id: file[fieldName].id,
                mimeType: file[fieldName].mimeType,
                filename: file[fieldName].filename,
                url: file[fieldName].url,
                variants: []
            });
        }
        return widgetItems;
    }
}
