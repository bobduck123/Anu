import { TrustCenterShell } from '@/components/trust/TrustCenterShell';
import { fetchPublicSponsorDisclosures } from '@/lib/api/publicSponsorDisclosures';
import { fetchPublicTrustReports } from '@/lib/api/publicTrust';

export default async function TrustCenterPage() {
  const [trustReports, sponsorDisclosures] = await Promise.all([
    fetchPublicTrustReports(8),
    fetchPublicSponsorDisclosures({ surface: '/trust', limit: 8 }),
  ]);

  return <TrustCenterShell trustReports={trustReports} sponsorDisclosures={sponsorDisclosures} />;
}
