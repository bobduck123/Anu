'use client';

import { useParams } from 'next/navigation';
import { FalakMapDetailPage } from '@/components/maps/FalakMapDetailPage';

export default function EducationMapDetailRoute() {
  const params = useParams<{ mapId: string }>();
  return <FalakMapDetailPage topicKey={params.mapId} />;
}
