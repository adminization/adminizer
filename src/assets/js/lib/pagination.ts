interface PaginationLink {
    label: string;
    active: boolean;
}

export interface PaginationResult {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    next_page_url: boolean | null;
    prev_page_url: boolean | null;
    from: number;
    to: number;
    links: PaginationLink[];
    showPages: number;
}


export function generatePagination(
    recordsTotal: number,
    count: number,
    currentPage: number,
    showPages: number
): PaginationResult {

    const lastPage = Math.ceil(recordsTotal / count);
    const from = recordsTotal === 0 ? 0 : (currentPage - 1) * count + 1;
    const to = Math.min(currentPage * count, recordsTotal);

    const links: PaginationLink[] = [];

    // Previous link
    links.push({
        label: 'Previous',
        active: false,
    });

    // Calculate page range
    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
    let endPage = Math.min(lastPage, startPage + showPages - 1);

    if (endPage - startPage + 1 < showPages) {
        startPage = Math.max(1, endPage - showPages + 1);
    }

    // Item numbers
    for (let page = startPage; page <= endPage; page++) {
        links.push({
            label: page.toString(),
            active: page === currentPage,
        });
    }

    // Next link
    links.push({
        label: 'Next',
        active: false,
    });

    return {
        total: recordsTotal,
        per_page: count,
        current_page: currentPage,
        last_page: lastPage,
        next_page_url: currentPage < lastPage ? true : null,
        prev_page_url: recordsTotal > 0 && currentPage > 1 ? true : null,
        from,
        to,
        links,
        showPages,
    };
}
