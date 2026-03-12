'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Package } from 'lucide-react';
import { api, Product } from '@/lib/api';
import { Card } from '@/ui-system/primitives/Card';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { ErrorState } from '@/ui-system/states/ErrorState';

export default function VendorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await api.marketplace.getProducts();
        setProducts(all.filter((p: Product) => String(p.sellerId || p.id) === id));
      } catch {
        setError('Failed to load vendor profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <LoadingState fullPage message="Loading vendor..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/marketplace" className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Marketplace
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>Vendor Profile</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">{products.length} products listed</p>
      </div>

      {products.length === 0 ? (
        <EmptyState icon={Package} title="No products" description="This vendor has no listed products." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} padding="none" hover className="overflow-hidden">
              <Image
                src={product.imageUrl || '/window.svg'}
                alt={product.name}
                width={640} height={384}
                unoptimized
                className="h-48 w-full object-cover"
              />
              <div className="p-5">
                <h3 className="font-semibold mb-1">{product.name}</h3>
                <p className="text-sm text-[var(--color-muted-foreground)] line-clamp-2 mb-3">{product.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold font-mono-data text-[var(--color-accent)]">${product.price}</span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">{product.category}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
