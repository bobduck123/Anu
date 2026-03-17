import { FalakMapAdminPage } from '@/components/maps/FalakMapAdminPage';

interface AdminMapsPageProps {
  searchParams: Promise<{ topic?: string }>;
}

export default async function AdminMapsPage({ searchParams }: AdminMapsPageProps) {
  const params = await searchParams;
  return <FalakMapAdminPage initialTopicKey={params.topic} />;
}
