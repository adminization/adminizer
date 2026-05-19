import {Input} from "@/components/ui/input.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx"
import {useContext, useEffect, useState, forwardRef, useImperativeHandle,} from "react";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";
import { adminApi } from '@/lib/admin-api';
import Tile from "@/components/media-manager/components/Tile.tsx";
import MediaTable from "@/components/media-manager/components/MediaTable.tsx";
import {Media} from "@/types";
import {Button} from "@/components/ui/button.tsx";
import {LoaderCircle} from "lucide-react";
import {debounce} from "lodash-es";

export interface GalleryRef {
    pushMediaItem: (item: Media) => void;
    addVariant: (media: Media, newVariant: Media) => void;
    destroyVariant: (media: Media, variant: Media) => void;
}

interface GalleryProps {
    openMeta: (media: Media) => void;
    crop: (media: Media) => void;
    openVariant: (media: Media) => void
    messages: Record<string, string>;
}

const Gallery = forwardRef<GalleryRef, GalleryProps>(({openMeta, crop, openVariant, messages}, ref) => {
    const [activeTab, setActiveTab] = useState<string>('tile-all');
    const [mediaType, setMediaType] = useState<string>('all');
    const {uploadUrl, group, initTab} = useContext(MediaManagerContext);
    const [count, _setCount] = useState<number>(15);
    const [mediaList, setMediaList] = useState<Media[]>([]);
    const [isLoadMore, setIsLoadMore] = useState<boolean>(false);
    const [skip, setSkip] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [pendingTab, setPendingTab] = useState<string | null>(null);

    const fetchData = async (type:string) => {
        const {data} = await adminApi.get<any>(`${uploadUrl}?count=${count}&skip=0&type=${type}&group=${group}`);
        setMediaList(data.data);
        setLoading(false);
        setIsLoadMore(data.next);
    };

    useEffect(() => {
        setActiveTab(initTab || 'tile-all');
    }, [initTab]);

    // Loading data on mount
    useEffect(() => {
        const initGallery = async () => {
            try {
                setLoading(true);
                await fetchData('all');
            } catch (error) {
                console.error('Error initializing media:', error);
            } finally {
            }
        };

        initGallery();
    }, []);


    // Method for adding new media
    const pushMediaItem = (item: Media) => {
        setSkip(prev => prev + 1);
        setMediaList(prev => [item, ...prev]);
    };

    const addVariant = (media: Media, newVariant: Media) => {
        setMediaList(prevMediaList =>
            prevMediaList.map(obj =>
                obj.id === media.id
                    ? {...obj, variants: [...obj.variants, newVariant]}
                    : obj
            )
        );
    }

    const destroyVariant = (media: Media, variant: Media) => {
        setMediaList(prevMediaList =>
            prevMediaList.map(obj =>
                obj.id === media.id
                    ? {...obj, variants: obj.variants.filter(v => v.id !== variant.id)}
                    : obj
            )
        );
    }

    useImperativeHandle(ref, () => ({
        pushMediaItem,
        addVariant,
        destroyVariant
    }));

    // Changing media type
    const handleChange = async (type: string, tabValue: string) => {
        setPendingTab(tabValue);
        setMediaList([]);
        setLoading(true);
        setSkip(0);
        setMediaType(type);
        try {
            const {data} = await adminApi.get(`${uploadUrl}?count=${count}&skip=0&type=${type}&group=${group}`);
            setMediaList(data.data);
            setIsLoadMore(data.next);
            setActiveTab(tabValue); // Change active tab
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setPendingTab(null);
        }
    };

    const loadMore = async () => {
        setLoading(true);
        try {
            const newSkip = skip + count;
            const {data} = await adminApi.get(`${uploadUrl}?count=${count}&skip=${newSkip}&type=${mediaType}&group=${group}`);
            setMediaList(prev => [...prev, ...data.data]);
            setIsLoadMore(data.next);
            setSkip(newSkip);
        } catch (error) {
            console.error("Error media load:", error);
        } finally {
            setLoading(false);
        }
    };

    const destroy = (media: Media) => {
        setMediaList(prev => prev.filter(item => item.id !== media.id));
    }

    const performSearch = async (s: string) => {
        setLoading(true);
        setMediaList([]);
        if(s.length > 0) {
            setIsLoadMore(false);
            setSkip(0)
            try {
                let res = await adminApi.post(uploadUrl, {
                    _method: "search",
                    type: mediaType,
                    group: group,
                    s: s,
                })
                setMediaList(res.data.data)
            } catch (error) {
                console.log(error)
            }
            finally {
                setLoading(false);
            }
        } else{
            await fetchData(mediaType);
        }

    }
    const handleSearch = debounce(performSearch, 500)

    // Render content
    const renderContent = (viewType: 'tile' | 'table') => {
        if (loading && mediaList.length === 0) {
            return <LoaderCircle className="mx-auto mt-14 size-12 animate-spin"/>;
        }
        if (mediaList.length === 0) {
            return <div className="text-center font-medium mt-8">
                {messages["No media found"]}
            </div>;
        }
        return viewType === 'tile'
            ? <Tile mediaList={mediaList} messages={messages} openMeta={openMeta} crop={crop} openVariant={openVariant} destroy={destroy} />
            : <MediaTable mediaList={mediaList} messages={messages} openMeta={openMeta} crop={crop} openVariant={openVariant} destroy={destroy}/>;
    };

    return (
        <div className="flex justify-between mt-8 gap-4 px-2 pb-4">
            <Tabs value={activeTab} className="w-full">
                <div className="flex gap-4 mb-4 flex-wrap md:flex-nowrap">
                    <Input
                        type="search"
                        placeholder={messages["Search"]}
                        onChange={(e) => {handleSearch(e.target.value)}}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                performSearch(e.currentTarget.value);
                            }
                        }}
                        className="w-[200px] p-2 border rounded"
                    />
                    <TabsList className="sm:w-full">
                        <TabsTrigger
                            className="text-[12px] sm:text-sm"
                            value="tile-image"
                            onClick={() => handleChange('image', 'tile-image')}
                            disabled={!!pendingTab}
                        >
                            {messages["Images"]}
                        </TabsTrigger>
                        <TabsTrigger
                            className="text-[12px] sm:text-sm"
                            value="table-video"
                            onClick={() => handleChange('video', 'table-video')}
                            disabled={!!pendingTab}
                        >
                            {messages["Videos"]}
                        </TabsTrigger>
                        <TabsTrigger
                            className="text-[12px] sm:text-sm"
                            value="table-text"
                            onClick={() => handleChange('text', 'table-text')}
                            disabled={!!pendingTab}
                        >
                            {messages["Texts"]}
                        </TabsTrigger>
                        <TabsTrigger
                            className="text-[12px] sm:text-sm"
                            value="table-application"
                            onClick={() => handleChange('application', 'table-application')}
                            disabled={!!pendingTab}
                        >
                            {messages["Applications"]}
                        </TabsTrigger>
                        <TabsTrigger
                            className="text-[12px] sm:text-sm"
                            value="table-all"
                            onClick={() => handleChange('all', 'table-all')}
                            disabled={!!pendingTab}
                        >
                            {messages["Table"]}
                        </TabsTrigger>
                        <TabsTrigger
                            className="text-[12px] sm:text-sm"
                            value="tile-all"
                            onClick={() => handleChange('all', 'tile-all')}
                            disabled={!!pendingTab}
                        >
                            {messages["Tile"]}
                        </TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="tile-image">{renderContent('tile')}</TabsContent>
                <TabsContent value="table-video">{renderContent('table')}</TabsContent>
                <TabsContent value="table-text">{renderContent('table')}</TabsContent>
                <TabsContent value="table-application">{renderContent('table')}</TabsContent>
                <TabsContent value="tile-all">{renderContent('tile')}</TabsContent>
                <TabsContent value="table-all">{renderContent('table')}</TabsContent>
                {isLoadMore && !pendingTab && (
                    <div className="mt-4 mx-auto relative">
                        <Button
                            className="w-fit"
                            onClick={loadMore}
                            disabled={loading}
                        >
                            {messages["Load more"]}
                        </Button>
                        {loading &&
                            <LoaderCircle className="size-6 animate-spin absolute -right-7 top-1/2 -translate-y-1/2"/>}
                    </div>
                )}
            </Tabs>
        </div>
    );
});

Gallery.displayName = 'Gallery';
export default Gallery;

