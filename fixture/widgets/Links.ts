import LinkBase, {Links} from "../../src/lib/v4/widgets/abstractLink";

export class SiteLinks extends LinkBase {
    icon?: string;
    size: { h: number; w: number; };
	readonly id: string = "siteLinks";
	readonly department: string = 'test';
	readonly description: string = 'links widget';
	readonly name: string = 'siteLinks';
	readonly widgetType = "link"

	readonly links: Links[] = [
        {
            name: 'Test',
            description: 'Add Test Model',
            link: '/adminizer/model/test/add',
            icon: 'hexagon',
            backgroundCSS: '#368869',
            linkType: "self"
        },
        {
            name: 'example.com',
            description: 'link to example.com',
            link: 'https://www.example.com',
            icon: null,
            backgroundCSS: null,
            linkType: "blank"
        },
        {
            name: 'Global Settings',
            description: 'Global Settings',
            link: '/adminizer/form/global',
            icon: 'polyline',
            backgroundCSS: null,
            linkType: "self"
        }
	];

	getLinks(): Promise<Links[]> {
		return Promise.resolve(this.links);
	}
}
