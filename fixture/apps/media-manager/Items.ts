import {
    AppRuntime,
    File,
    MediaFileType,
    MediaManagerItem,
    QueryCriteria,
    SortCriteria,
    UploaderFile,
    populateVariants
} from "../../../dist";
import sizeOf from "image-size";
import sharp from "sharp";
import * as fs from "fs";
import path from "path";
import {mediaManagerModelNames} from "./MediaManagerModels";
import type {
    MediaManagerAssociationRecord,
    MediaManagerMetaRecord,
    PublicMediaManagerMeta,
} from "./MediaManagerTypes";

type ImageSizes = Record<string, {width: number; height: number}>;

export class ImageItem extends File<MediaManagerItem> {
    readonly type: MediaFileType = "image";

    constructor(
        protected readonly runtime: AppRuntime,
        urlPathPrefix: string,
        fileStoragePath: string,
        private readonly imageSizes: ImageSizes = {}
    ) {
        super(urlPathPrefix, fileStoragePath);
    }

    protected media() {
        return this.runtime.models.get<MediaManagerItem>(mediaManagerModelNames.media);
    }

    protected meta() {
        return this.runtime.models.get<MediaManagerMetaRecord>(mediaManagerModelNames.meta);
    }

    protected associations() {
        return this.runtime.models.get<MediaManagerAssociationRecord>(
            mediaManagerModelNames.associations
        );
    }

    async getItems(limit: number, skip: number, sort: SortCriteria, group?: string) {
        const where: QueryCriteria<MediaManagerItem>["where"] = {
            parent: null,
            mimeType: {contains: this.type},
            group,
        };
        const data = await this.media().find({
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
        const next = await this.media().find({where, limit, skip: skip + limit, sort});
        return {data, next: next.length > 0};
    }

    async search(search: string, group?: string): Promise<MediaManagerItem[]> {
        const data = await this.media().find({
            where: {
                filename: {contains: search},
                mimeType: {contains: this.type},
                parent: null,
                group,
            },
            sort: "createdAt DESC",
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

    async upload(
        file: UploaderFile,
        filename: string,
        originalName: string,
        group?: string
    ): Promise<MediaManagerItem[]> {
        const parent = await this.media().create({
            parent: null,
            mimeType: file.mimetype,
            size: file.size,
            path: this.storagePath(filename),
            group,
            tag: "origin",
            filename: originalName,
            url: this.publicUrl(filename),
        });
        await this.createMeta(parent.id);
        await this.addImageSizeMeta(file.path, parent.id);
        if (Object.keys(this.imageSizes).length && file.mimetype !== "image/svg+xml") {
            await this.createVariants(file, parent, filename, group);
        }
        return [await this.getFile(parent.id)];
    }

    async getVariants(id: string): Promise<MediaManagerItem[]> {
        const item = await this.media().findOne({
            where: {id},
            populate: {variants: {sort: "createdAt DESC"}},
        });
        return populateVariants(
            this.runtime,
            item?.variants ?? [],
            mediaManagerModelNames.media
        );
    }

    async getOrigin(id: string): Promise<string> {
        return (await this.media().findOne({where: {id}})).path;
    }

    async getFile(id: number | string): Promise<MediaManagerItem> {
        const item = await this.media().findOne({
            where: {id: String(id)},
            populate: {variants: {sort: "createdAt DESC"}, meta: true},
        });
        if (item) {
            item.variants = await populateVariants(
                this.runtime,
                item.variants ?? [],
                mediaManagerModelNames.media
            );
        }
        return item;
    }

    async getMeta(id: string): Promise<PublicMediaManagerMeta[]> {
        const item = await this.media().findOne({
            where: {id},
            populate: {meta: {where: {isPublic: true}}},
        });
        return (item?.meta ?? []).flatMap((meta) =>
            typeof meta.key === "string" && typeof meta.value === "string"
                ? [{key: meta.key, value: meta.value}]
                : []
        );
    }

    async setMeta(id: string, data: Record<string, string>): Promise<void> {
        for (const [key, value] of Object.entries(data)) {
            await this.meta().update({where: {parentId: id, key}}, {value});
        }
    }

    async uploadVariant(
        parent: MediaManagerItem,
        file: UploaderFile,
        filename: string,
        group?: string,
        localeId?: string
    ): Promise<MediaManagerItem> {
        const dimensions = sizeOf(fs.readFileSync(file.path));
        const item = await this.media().create({
            parent: parent.id,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            group,
            tag: localeId ? `loc:${localeId}` : `size:${dimensions.width}x${dimensions.height}`,
            filename: parent.filename,
            url: this.publicUrl(filename),
        });
        await this.addImageSizeMeta(file.path, item.id);
        return this.media().findOne({where: {id: item.id}});
    }

    async delete(id: string): Promise<boolean> {
        if ((await this.associations().find({where: {fileId: id}})).length) {
            return false;
        }

        const criteria: QueryCriteria = {where: {id}};
        const record = await this.media().findOne({
            ...criteria,
            populate: {variants: true, meta: true},
        });
        if (!record) {
            return true;
        }

        for (const meta of record.meta ?? []) {
            await this.meta().destroy({where: {id: meta.id}});
        }
        for (const variant of record.variants ?? []) {
            await this.media().destroy({where: {id: variant.id}});
            await deleteFile(variant.path);
        }
        await this.media().destroy(criteria);
        await deleteFile(record.path);
        return true;
    }

    protected async createMeta(id: string): Promise<void> {
        for (const key of ["author", "description", "title"]) {
            await this.meta().create({key, value: "", parent: id, isPublic: true});
        }
    }

    private async addImageSizeMeta(filePath: string, id: string): Promise<void> {
        await this.meta().create({
            key: "imageSizes",
            value: sizeOf(fs.readFileSync(filePath)),
            parent: id,
            isPublic: false,
        });
    }

    private async createVariants(
        file: UploaderFile,
        parent: MediaManagerItem,
        filename: string,
        group?: string
    ): Promise<void> {
        const dimensions = sizeOf(fs.readFileSync(file.path));
        for (const [sizeName, target] of Object.entries(this.imageSizes)) {
            if (dimensions.width < target.width || dimensions.height < target.height) {
                continue;
            }

            const variantName = addFileSuffix(filename, sizeName);
            const output = this.storagePath(variantName);
            await fs.promises.mkdir(path.dirname(output), {recursive: true});
            const resized = await sharp(file.path)
                .resize({width: target.width, height: target.height})
                .toFile(output);
            const variant = await this.media().create({
                parent: parent.id,
                mimeType: parent.mimeType,
                size: resized.size,
                filename: parent.filename,
                group,
                path: output,
                tag: `size:${sizeName}`,
                url: this.publicUrl(variantName),
            });
            await this.addImageSizeMeta(output, variant.id);
        }
    }

    protected storagePath(filename: string): string {
        return path.join(this.fileStoragePath, this.urlPathPrefix, filename);
    }

    protected publicUrl(filename: string): string {
        return `/${this.urlPathPrefix}/${filename}`;
    }
}

export class TextItem extends ImageItem {
    readonly type: MediaFileType = "text";

    async upload(
        file: UploaderFile,
        filename: string,
        originalName: string,
        group?: string
    ): Promise<MediaManagerItem[]> {
        const item = await this.media().create({
            parent: null,
            mimeType: file.mimetype,
            size: file.size,
            path: this.storagePath(filename),
            group,
            filename: originalName,
            tag: "origin",
            url: this.publicUrl(filename),
        });
        await this.createMeta(item.id);
        return [await this.getFile(item.id)];
    }

    async uploadVariant(
        parent: MediaManagerItem,
        file: UploaderFile,
        filename: string,
        group?: string,
        localeId?: string
    ): Promise<MediaManagerItem> {
        const variants = (parent.variants ?? []).filter((item) => !/^loc:/.test(item.tag));
        const item = await this.media().create({
            parent: parent.id,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            group,
            tag: localeId ? `loc:${localeId}` : `ver:${variants.length + 1}`,
            filename: parent.filename,
            url: this.publicUrl(filename),
        });
        return this.media().findOne({where: {id: item.id}});
    }
}

export class ApplicationItem extends TextItem {
    readonly type: MediaFileType = "application";
}

export class VideoItem extends TextItem {
    readonly type: MediaFileType = "video";
}

function addFileSuffix(filename: string, suffix: string): string {
    return filename.replace(/\.[^.]+$/, `_${suffix}$&`);
}

async function deleteFile(filePath: string): Promise<void> {
    try {
        await fs.promises.unlink(filePath);
    } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
        }
    }
}
