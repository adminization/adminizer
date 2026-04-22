import {FC} from "react";
import {PaginationResult} from "@/lib/pagination.ts";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination.tsx";
import {usePage} from "@inertiajs/react";
import {SharedData} from "@/types";

interface PaginationProps {
    pagination: PaginationResult
    pageChange: (page: number) => void
    currentPage: number
}

const PaginationRender: FC<PaginationProps> = ({pagination, pageChange, currentPage}) => {
    const page = usePage<SharedData>();
    const messages = page.props.uiMessages ?? {};
    const firstLabel = messages.First || "First";
    const lastLabel = messages.Last || "Last";
    const previousLabel = messages.Previous || "Previous";
    const nextLabel = messages.Next || "Next";

    const showFirstButton = currentPage !== 1 && pagination.last_page > 1;
    const showLastButton = currentPage !== pagination.last_page && pagination.last_page > 1;

    return (
        <Pagination>
            <PaginationContent className="flex-wrap">
                {/* First Item Button - show only when not on the first page */}
                <PaginationItem className={`${showFirstButton ? '' : 'opacity-40 pointer-events-none'}`}>
                    <PaginationLink
                        className="px-6 cursor-pointer bg-secondary hover:bg-muted-foreground/15"
                        onClick={(e) => {
                            e.preventDefault()
                            pageChange(1)
                        }}
                    >
                        {firstLabel}
                    </PaginationLink>
                </PaginationItem>

                {/* Previous Item Button */}
                <PaginationItem>
                    <PaginationPrevious
                        label={previousLabel}
                        className={`cursor-pointer bg-secondary hover:bg-muted-foreground/15 ${!pagination.prev_page_url ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={(e) => {
                            e.preventDefault()
                            if (pagination.prev_page_url) {
                                pageChange(currentPage - 1)
                            }
                        }}
                    />
                </PaginationItem>

                {/* Item Numbers */}
                {pagination.links.map((link, index) => {
                    if (link.label === 'Previous' || link.label === 'Next' || link.label === previousLabel || link.label === nextLabel) return null;
                    return (
                        <PaginationItem key={index}>
                            <PaginationLink
                                className={`cursor-pointer bg-secondary hover:bg-muted-foreground/15 ${link.active ? '!bg-primary dark:!bg-muted-foreground !text-primary-foreground dark:!text-ring' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault()
                                    const pageNumber = parseInt(link.label)
                                    pageChange(pageNumber)
                                }}
                                isActive={link.active}
                            >
                                {link.label}
                            </PaginationLink>
                        </PaginationItem>
                    );
                })}

                {/* Next Item Button */}
                <PaginationItem>
                    <PaginationNext
                        label={nextLabel}
                        className={`cursor-pointer bg-secondary hover:bg-muted-foreground/15 ${!pagination.next_page_url ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={(e) => {
                            e.preventDefault()
                            if (pagination.next_page_url) {
                                pageChange(currentPage + 1)
                            }
                        }}
                    />
                </PaginationItem>

                {/* Last Item Button - show only when not on the last page */}
                <PaginationItem className={`${showLastButton ? '' : 'opacity-40 pointer-events-none'}`}>
                    <PaginationLink
                        className="px-6 cursor-pointer bg-secondary hover:bg-muted-foreground/15"
                        onClick={(e) => {
                            e.preventDefault()
                            pageChange(pagination.last_page)
                        }}
                    >
                        {lastLabel}
                    </PaginationLink>
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
};

export default PaginationRender;
