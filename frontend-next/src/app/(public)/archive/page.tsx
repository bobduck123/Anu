import { ArchiveShell } from '@/components/archive/ArchiveShell';
import { fetchPublicTrustReports } from '@/lib/api/publicTrust';

export default async function ArchiveIndexPage() {
  const trustReports = await fetchPublicTrustReports();

  return <ArchiveShell reports={trustReports.reports} degradedHonesty={trustReports.degradedHonesty} />;
}
