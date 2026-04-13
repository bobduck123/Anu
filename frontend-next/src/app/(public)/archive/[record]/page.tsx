import { ArchiveRecordShell } from '@/components/archive/ArchiveRecordShell';
import { fetchPublicSponsorDisclosures, type PublicSponsorDisclosureFeed } from '@/lib/api/publicSponsorDisclosures';
import {
  fetchPublicArchiveHandoff,
  fetchPublicTrustReportDetail,
  type ArchiveDegradedHonesty,
} from '@/lib/api/publicTrust';

export default async function ArchiveRecordPage({ params }: { params: { record: string } }) {
  const recordRef = params.record;
  const fallbackSponsorFeed: PublicSponsorDisclosureFeed = {
    disclosures: [],
    disclosureState: 'degraded',
    degradedHonesty: {
      isDegraded: true,
      reason: 'sponsor_disclosure_context_missing',
      fallback: 'Sponsor disclosure status is unavailable for this archive record context.',
    },
  };

  const trustDetail = await fetchPublicTrustReportDetail(recordRef);
  if (trustDetail.report) {
    const sponsorFeed = await fetchPublicSponsorDisclosures({
      surface: '/archive',
      report: trustDetail.report.slug,
      archive: trustDetail.archiveRecord?.slug ?? undefined,
      limit: 5,
    });

    return (
      <ArchiveRecordShell
        recordRef={recordRef}
        report={trustDetail.report}
        archiveRecord={trustDetail.archiveRecord}
        degradedHonesty={trustDetail.degradedHonesty}
        sponsorFeed={sponsorFeed}
      />
    );
  }

  const handoff = await fetchPublicArchiveHandoff(recordRef);
  if (handoff) {
    const degradedHonesty: ArchiveDegradedHonesty = {
      isDegraded: handoff.trustReport == null,
      reason: handoff.trustReport == null ? 'archive_record_without_trust_report' : null,
      fallback: handoff.trustReport == null
        ? 'Archive record exists, but trust-report detail is not published for this record yet.'
        : null,
    };

    return (
      <ArchiveRecordShell
        recordRef={recordRef}
        report={handoff.trustReport}
        archiveRecord={handoff.archiveRecord}
        degradedHonesty={degradedHonesty}
        sponsorFeed={await fetchPublicSponsorDisclosures({
          surface: '/archive',
          report: handoff.trustReport?.slug ?? undefined,
          archive: handoff.archiveRecord.slug,
          limit: 5,
        })}
      />
    );
  }

  return (
    <ArchiveRecordShell
      recordRef={recordRef}
      report={null}
      archiveRecord={null}
      sponsorFeed={fallbackSponsorFeed}
      degradedHonesty={{
        isDegraded: true,
        reason: 'archive_record_not_found',
        fallback: 'No published trust or archive record exists for this deep link yet.',
      }}
    />
  );
}
