import { File, MediaFileType, MediaManagerItem, SortCriteria, UploaderFile } from "./AbstractMediaManager";
import { populateVariants, randomFileName } from "./helpers/MediaManagerHelper";
import sizeOf from "image-size";
import sharp from "sharp";
import * as fs from 'fs';
import * as path from 'path';
import { Adminizer } from "../Adminizer";
import * as process from "node:process";

interface Meta {
    [key: string]: string;
}

export class ImageItem extends File<MediaManagerItem> {
    public type: MediaFileType = "image";
    public model: string = "mediamanagerap";
    public metaModel: string = "mediamanagermetaap";
    public modelAssoc: string = "mediamanagerassociationsap";
    public imageSizes: any
    protected readonly adminizer: Adminizer

    constructor(adminizer: Adminizer, urlPathPrefix: string, fileStoragePath: string) {
        super(urlPathPrefix, fileStoragePath);
        this.imageSizes = adminizer.config.mediamanager.imageSizes || {};
        this.adminizer = adminizer;
    }

    public async getItems(limit: number, skip: number, sort: SortCriteria, group: string): Promise<{
        data: MediaManagerItem[];
        next: boolean
    }> {
        // TODO refactor CRUD functions for DataAccessor usage
        let data: MediaManagerItem[] = await this.adminizer.modelHandler.model.get(this.model)["_find"](
            {
                where: { parent: null, mimeType: { contains: this.type }, group: group },
                limit: limit,
                skip: skip,
                sort: sort,
                //populate:{...}
                //select: {...}
            },
            {
                populate: [
                    ["variants", { sort: sort }],
                    ["meta", {}]
                ]
            },
        )

        let next = await this.adminizer.modelHandler.model.get(this.model)['_find']({
            where: { parent: null, mimeType: { contains: this.type }, group: group },
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

    public async search(s: string, group: string): Promise<MediaManagerItem[]> {
        // TODO refactor CRUD functions for DataAccessor usage
        let data: MediaManagerItem[] = await this.adminizer.modelHandler.model.get(this.model)["_find"]({
            where: { filename: { contains: s }, mimeType: { contains: this.type }, parent: null, group: group },
            sort: "createdAt DESC",
        }, { populate: [["variants", { sort: "createdAt DESC" }]] })
        for (let elem of data) {
            elem.variants = await populateVariants(this.adminizer, elem.variants, this.model)
        }
        return data
    }

    public async upload(file: UploaderFile, filename: string, origFileName: string, group: string): Promise<MediaManagerItem[]> {

        // TODO refactor CRUD functions for DataAccessor usage
        let parent: MediaManagerItem = await this.adminizer.modelHandler.model.get(this.model)["_create"]({
            parent: null,
            mimeType: file.mimetype,
            size: file.size,
            path: `${this.fileStoragePath}/${this.urlPathPrefix}/${filename}`,
            group: group,
            tag: "origin",
            filename: origFileName,
            url: `/${this.urlPathPrefix}/${filename}`,
        })

        await this.createMeta(parent.id);
        await this.addFileMeta(file.path, parent.id)

        // create file variants
        if (Object.keys(this.imageSizes).length && file.mimetype !== 'image/svg+xml') {
            await this.createVariants(file, parent, filename, group);
        }

        // TODO refactor CRUD functions for DataAccessor usage
        const item: MediaManagerItem = await this.adminizer.modelHandler.model.get(this.model)["_findOne"]({ where: { id: parent.id } });
        item.variants = await populateVariants(this.adminizer, item.variants, this.model)
        return [item]
    }

    public async getVariants(id: string): Promise<MediaManagerItem[]> {
        // TODO refactor CRUD functions for DataAccessor usage
        let items = ((await this.adminizer.modelHandler.model.get(this.model)["_find"]({
            where: { id: id }
        }, { populate: [["variants", { sort: "createdAt DESC" }]] }))[0]).variants
        return (await populateVariants(this.adminizer, items, this.model))
    }

    protected async createVariants(file: UploaderFile, parent: MediaManagerItem, filename: string, group: string): Promise<void> {
        for (const sizeKey of Object.keys(this.imageSizes)) {
            let sizeName = randomFileName(filename, sizeKey, false);

            let { width, height } = this.imageSizes[sizeKey];

            const buffer = fs.readFileSync(file.path)
            const image = sizeOf(buffer)

            if (image.width < width || image.height < height) continue;

            const output = `${this.fileStoragePath}/${this.urlPathPrefix}/${sizeName}`

            let newFile = await this.resizeImage(
                file.path,
                output,
                width,
                height,
            );

            // TODO refactor CRUD functions for DataAccessor usage
            let newSize = await this.adminizer.modelHandler.model.get(this.model)["_create"]({
                parent: parent.id,
                mimeType: parent.mimeType,
                size: newFile.size,
                filename: parent.filename,
                group: group,
                path: output,
                tag: `saze:${sizeKey}`,
                url: `/${this.urlPathPrefix}/${sizeName}`,
            })

            await this.addFileMeta(output, newSize.id)

        }
    }

    public async getOrigin(id: string): Promise<string> {
        // TODO refactor CRUD functions for DataAccessor usage
        return (await this.adminizer.modelHandler.model.get(this.model)["_findOne"]({ where: { id: id } })).path;
    }

    public async getFile(id: number): Promise<MediaManagerItem> {
        let item = await this.adminizer.modelHandler.model.get(this.model)["_findOne"]({ where: { id: id } });
        item.variants = await populateVariants(this.adminizer, item.variants, this.model)
        return item
    }

    protected async createMeta(id: string): Promise<void> {
        //create empty meta
        let metaData: Meta = {
            author: "",
            description: "",
            title: "",
        };

        for (const key of Object.keys(metaData)) {
            // TODO refactor CRUD functions for DataAccessor usage
            await this.adminizer.modelHandler.model.get(this.metaModel)["_create"]({
                key: key,
                value: metaData[key],
                parent: id,
                isPublic: true
            });
        }

    }

    protected async addFileMeta(file: string, id: string): Promise<void> {
        // TODO refactor CRUD functions for DataAccessor usage
        const metaBuffer = fs.readFileSync(file)
        await this.adminizer.modelHandler.model.get(this.metaModel)["_create"]({
            key: 'imageSizes',
            value: sizeOf(metaBuffer),
            parent: id,
            isPublic: false
        });
    }

    // TODO  {where: {isPublic: true}, sort: "id ASC"} ???
    public async getMeta(id: string,): Promise<{ key: string; value: string }[]> {
        // TODO refactor CRUD functions for DataAccessor usage
        return ((await this.adminizer.modelHandler.model.get(this.model)["_find"]({
            id: id
        }, { populate: [["meta", { where: { isPublic: true } }]] }))[0]).meta;
    }

    async setMeta(id: string, data: { [p: string]: string },): Promise<void> {
        for (const key of Object.keys(data)) {
            // TODO refactor CRUD functions for DataAccessor usage
            await this.adminizer.modelHandler.model.get(this.metaModel)["_update"](
                { parent: id, key: key },
                { value: data[key] },
            );
        }
    }

    protected async resizeImage(input: string, output: string, width: number, height: number,) {
        // Get the directory from the output path
        const outputDir = `${process.cwd()}/${path.dirname(output)}`;
        // Check if the directory exists, and create it if it doesn't
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Resize the image and save it to the output path
        return await sharp(input)
            .resize({ width: width, height: height })
            .toFile(output);
    }

    public async uploadVariant(parent: MediaManagerItem, file: UploaderFile, filename: string, group: string, localeId: string): Promise<MediaManagerItem> {
        const variantBuffer = fs.readFileSync(file.path)
        const { width, height } = sizeOf(variantBuffer)

        // TODO refactor CRUD functions for DataAccessor usage
        let item: MediaManagerItem = await this.adminizer.modelHandler.model.get(this.model)["_create"]({
            parent: parent.id,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            group: group,
            tag: localeId ? `loc:${localeId}` : `size:${width}x${height}`,
            filename: parent.filename,
            url: `/${this.urlPathPrefix}/${filename}`,
        })

        await this.addFileMeta(file.path, item.id)

        // TODO refactor CRUD functions for DataAccessor usage
        return (await this.adminizer.modelHandler.model.get(this.model)["_findOne"]({ where: { id: item.id } }))
    }

    async delete(id: string): Promise<boolean> {
        const fieldName = this.adminizer.ormAdapters[0].ormType === 'sequelize' ? 'fileId' : 'file';
        const assoc = await this.adminizer.modelHandler.model.get(this.modelAssoc)["_find"]({ where: { [fieldName]: id } })
        if (assoc.length) {
            return Promise.resolve(false);
        }
        const criteria = { where: { id: id } };
        // TODO refactor CRUD functions for DataAccessor usage
        let record = await this.adminizer.modelHandler.model.get(this.model)["_findOne"](criteria);

        await beforeDestroy(this.adminizer, criteria);
        // TODO refactor CRUD functions for DataAccessor usage
        await this.adminizer.modelHandler.model.get(this.model)["_destroy"]({ id: id });

        await deleteFile(record.path);
        // Delete all variants
        if (record.variants.length) {
            for (const variant of record.variants) {
                await deleteFile(variant.path);
            }
        }

        return Promise.resolve(true);
    }
}

/*
 * Text item
 */
export class TextItem extends ImageItem {
    public type: MediaFileType = "text";

    public async upload(file: UploaderFile, filename: string, origFileName: string, group: string): Promise<MediaManagerItem[]> {
        // TODO refactor CRUD functions for DataAccessor usage
        let parent: MediaManagerItem = await this.adminizer.modelHandler.model.get(this.model)["_create"]({
            parent: null,
            mimeType: file.mimetype,
            size: file.size,
            path: `${this.fileStoragePath}/${filename}`,
            group: group,
            filename: origFileName,
            tag: "origin",
            url: `/${this.urlPathPrefix}/${filename}`,
        })

        await this.createMeta(parent.id);

        // TODO refactor CRUD functions for DataAccessor usage
        const item: MediaManagerItem = await this.adminizer.modelHandler.model.get(this.model)["_findOne"]({ where: { id: parent.id } });
        item.variants = await populateVariants(this.adminizer, item.variants, this.model)
        return [item]
    }

    getvariants(): Promise<MediaManagerItem[]> {
        return Promise.resolve([]);
    }

    public async uploadVariant(parent: MediaManagerItem, file: UploaderFile, filename: string, group: string, localeId: string): Promise<MediaManagerItem> {
        let variants = parent.variants.filter(e => /^loc:/.test(e.tag) === false)
        // TODO refactor CRUD functions for DataAccessor usage
        let item: MediaManagerItem = await this.adminizer.modelHandler.model.get(this.model)["_create"]({
            parent: parent.id,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            group: group,
            tag: localeId ? `loc:${localeId}` : `ver: ${variants.length + 1}`,
            filename: parent.filename,
            url: `/${this.urlPathPrefix}/${filename}`,
        })

        // TODO refactor CRUD functions for DataAccessor usage
        return (await this.adminizer.modelHandler.model.get(this.model)["_findOne"]({ where: { id: item.id } }))
    }

    public async getVariants(id: string): Promise<MediaManagerItem[]> {
        // TODO refactor CRUD functions for DataAccessor usage
        let items = ((await this.adminizer.modelHandler.model.get(this.model)["_find"]({
            where: { id: id }
        }, { populate: [["variants", { sort: "createdAt DESC" }]] }))[0]).variants
        return (await populateVariants(this.adminizer, items, this.model))
    }
}

export class ApplicationItem extends TextItem {
    public type: MediaFileType = "application";
}

export class VideoItem extends TextItem {
    public type: MediaFileType = "video";
}

async function beforeDestroy(adminizer: Adminizer, criteria: { where: object }) {
    // TODO refactor CRUD functions for DataAccessor usage
    let parent: ModelsAP["MediaManagerAP"] = (await adminizer.modelHandler.model.get("MediaManagerAP")?.["_find"](criteria))[0]
    let meta = parent.meta
    for (const metaElement of meta) {
        // TODO refactor CRUD functions for DataAccessor usage
        await adminizer.modelHandler.model.get("MediaManagerMetaAP")?.["_destroy"]({ id: metaElement.id })
    }

    // TODO refactor CRUD functions for DataAccessor usage
    let variants: ModelsAP["MediaManagerAP"]["variants"] = (await adminizer.modelHandler.model.get("MediaManagerAP")?.["_find"](criteria))[0].variants
    for (const child of variants) {
        // TODO refactor CRUD functions for DataAccessor usage
        await adminizer.modelHandler.model.get("MediaManagerAP")?.["_destroy"]({ id: child.id })
    }
}


async function deleteFile(file: string) {
    try {
        await fs.promises.access(file);
        await fs.promises.unlink(file);

    } catch (err) {
        if (err.code === 'ENOENT') {

        } else if (err.code === 'EPERM') {

        } else {
            console.error(`An error occurred: ${err}`);
        }
    }
}
