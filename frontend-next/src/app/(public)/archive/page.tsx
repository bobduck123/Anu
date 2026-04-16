import { ArchiveShell } from '@/components/archive/ArchiveShell';
import { fetchPublicArchiveSummaries, normalizeArchiveTitlePrefix } from '@/lib/api/publicArchive';

interface ArchiveIndexPageProps {
  searchParams?: Promise<{ type?: string | string[] | undefined; page?: string | string[] | undefined; title_prefix?: string | string[] | undefined }> | { type?: string | string[] | undefined; page?: string | string[] | undefined; title_prefix?: string | string[] | undefined };
}

export default async function ArchiveIndexPage({ searchParams }: ArchiveIndexPageProps) {
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams;
  const recordType = typeof resolvedSearchParams?.type === 'string' ? resolvedSearchParams.type : undefined;
  const titlePrefix = normalizeArchiveTitlePrefix(
    typeof resolvedSearchParams?.title_prefix === 'string' ? resolvedSearchParams.title_prefix : undefined,
  ) ?? undefined;
  const rawPage = typeof resolvedSearchParams?.page === 'string' ? resolvedSearchParams.page : undefined;
  const parsedPage = rawPage ? Number.parseInt(rawPage, 10) : 1;
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const archiveFeed = await fetchPublicArchiveSummaries({ page, pageSize: 12, recordType, titlePrefix });

  return (
    <ArchiveShell
      records={archiveFeed.records}
      pagination={archiveFeed.pagination}
      availableRecordTypes={archiveFeed.availableRecordTypes}
      appliedRecordTypeFilter={archiveFeed.appliedRecordTypeFilter}
      appliedTitlePrefixFilter={archiveFeed.appliedTitlePrefixFilter}
      degradedHonesty={archiveFeed.degradedHonesty}
    />
  );
}
