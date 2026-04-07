'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, ImagePlus, Loader2, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { dumbDumbApi, type DumbDumbItem, type DumbDumbList } from '@/lib/api/dumbDumbApi';
import { poolsApi, type ImpactPool } from '@/lib/api/endpoints';
import { Button } from '@/ui-system/primitives/Button';
import { Card } from '@/ui-system/primitives/Card';
import { Checkbox, FormField, Input, Select, Textarea } from '@/ui-system/primitives/Form';
import { brand } from '@/lib/brand';

const DEFAULT_DISCLAIMER =
  'Dumb Dumb Mode is transparent satire. You are not buying a real product. Your contribution funds the real mutual-aid outcome shown on each item.';

type ItemFormState = {
  title: string;
  parody_description: string;
  image_url: string;
  source_url: string;
  source_site_name: string;
  icon_key: string;
  price_cents: number;
  mutual_aid_pool_id: number;
  impact_title: string;
  impact_description: string;
  quantity_limit: number | null;
  is_active: boolean;
};

export default function DumbDumbManagePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [lists, setLists] = useState<DumbDumbList[]>([]);
  const [pools, setPools] = useState<ImpactPool[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingList, setSavingList] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [importingSource, setImportingSource] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listForm, setListForm] = useState({
    title: '',
    intro_text: '',
    parody_disclaimer: DEFAULT_DISCLAIMER,
    is_public: true,
    is_active: true,
  });
  const [itemForm, setItemForm] = useState<ItemFormState>({
    title: '',
    parody_description: '',
    image_url: '',
    source_url: '',
    source_site_name: '',
    icon_key: 'SPARK',
    price_cents: 1800,
    mutual_aid_pool_id: 0,
    impact_title: '',
    impact_description: '',
    quantity_limit: 12,
    is_active: true,
  });

  const selectedList = useMemo(
    () => lists.find((entry) => entry.id === selectedListId) || null,
    [lists, selectedListId],
  );
  const selectedItem = useMemo(
    () => selectedList?.items?.find((entry) => entry.id === selectedItemId) || null,
    [selectedItemId, selectedList],
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRows, poolRows] = await Promise.all([dumbDumbApi.myLists(), poolsApi.list()]);
      setLists(listRows);
      setPools(poolRows);
      if (listRows[0]) {
        setSelectedListId((prev) => prev ?? listRows[0].id);
      }
      if (poolRows[0]) {
        setItemForm((prev) => ({ ...prev, mutual_aid_pool_id: prev.mutual_aid_pool_id || poolRows[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load creator tools.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void load();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedList) return;
    setListForm({
      title: selectedList.title,
      intro_text: selectedList.intro_text || '',
      parody_disclaimer: selectedList.parody_disclaimer,
      is_public: selectedList.is_public,
      is_active: selectedList.is_active,
    });
    setSelectedItemId(selectedList.items?.[0]?.id || null);
  }, [selectedList]);

  useEffect(() => {
    if (!selectedItem) {
      setItemForm((prev) => ({
        ...prev,
        title: '',
        parody_description: '',
        image_url: '',
        source_url: '',
        source_site_name: '',
        impact_title: '',
        impact_description: '',
      }));
      return;
    }
    setItemForm({
      title: selectedItem.title,
      parody_description: selectedItem.parody_description || '',
      image_url: selectedItem.image_url || '',
      source_url: selectedItem.source_url || '',
      source_site_name: selectedItem.source_site_name || '',
      icon_key: selectedItem.icon_key || 'SPARK',
      price_cents: selectedItem.price_cents,
      mutual_aid_pool_id: selectedItem.destination_pool.id,
      impact_title: selectedItem.impact_title,
      impact_description: selectedItem.impact_description,
      quantity_limit: selectedItem.quantity_limit || 12,
      is_active: selectedItem.is_active,
    });
  }, [selectedItem]);

  const saveList = async () => {
    setSavingList(true);
    setError(null);
    try {
      let saved: DumbDumbList;
      if (selectedList) {
        saved = await dumbDumbApi.updateList(selectedList.id, listForm);
      } else {
        saved = await dumbDumbApi.createList(listForm);
      }
      await load();
      setSelectedListId(saved.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save list.');
    } finally {
      setSavingList(false);
    }
  };

  const saveItem = async () => {
    if (!selectedList) {
      setError('Create or select a list first.');
      return;
    }
    setSavingItem(true);
    setError(null);
    try {
      const quantityLimit = itemForm.quantity_limit;
      const payload = {
        ...itemForm,
        image_url: itemForm.image_url.trim() || null,
        source_url: itemForm.source_url.trim() || null,
        source_site_name: itemForm.source_site_name.trim() || null,
        quantity_limit: typeof quantityLimit === 'number' && Number.isFinite(quantityLimit) && quantityLimit > 0 ? quantityLimit : null,
      };
      let saved: DumbDumbItem;
      if (selectedItem) {
        saved = await dumbDumbApi.updateItem(selectedItem.id, payload);
      } else {
        saved = await dumbDumbApi.createItem(selectedList.id, payload);
      }
      await load();
      setSelectedListId(selectedList.id);
      setSelectedItemId(saved.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save item.');
    } finally {
      setSavingItem(false);
    }
  };

  const importSource = async () => {
    const sourceUrl = itemForm.source_url.trim();
    if (!sourceUrl) {
      setError('Paste a store URL first.');
      return;
    }
    setImportingSource(true);
    setError(null);
    try {
      const preview = await dumbDumbApi.sourcePreview(sourceUrl);
      setItemForm((prev) => ({
        ...prev,
        source_url: preview.source_url || sourceUrl,
        source_site_name: preview.source_site_name || prev.source_site_name,
        image_url: preview.image_url || prev.image_url,
        title: preview.title || prev.title,
        parody_description: preview.parody_description || prev.parody_description,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import that store listing.');
    } finally {
      setImportingSource(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-institutional)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Card padding="lg" className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-institutional)]">Creator tools</p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
            Sign in to create a Dumb Dumb list
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-earth-medium)]">
            {brand.dumbDumbSupportLine}
          </p>
          <Link
            href="/auth"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--color-institutional)] px-6 py-3 text-sm font-medium text-[var(--color-foreground)]"
          >
            Sign in
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-institutional)]">Dumb Dumb Mode</p>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
            Creator studio
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-earth-medium)]">
            Build parody items that are explicit about the real mutual-aid pool they fund.
          </p>
        </div>
        {selectedList ? (
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/wishlist/${selectedList.slug}`}
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-earth-dark)] px-5 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:opacity-92"
            >
              Preview discreet share page
            </Link>
            <Link
              href={`/dumb-dumb/${selectedList.slug}`}
              className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-earth-dark)] transition-colors hover:bg-[var(--color-muted)]"
            >
              Open platform list
            </Link>
          </div>
        ) : null}
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-light)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card padding="lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">List settings</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                Public list
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedListId(null);
                setSelectedItemId(null);
                setListForm({
                  title: '',
                  intro_text: '',
                  parody_disclaimer: DEFAULT_DISCLAIMER,
                  is_public: true,
                  is_active: true,
                });
              }}
            >
              <Plus className="h-4 w-4" />
              New list
            </Button>
          </div>

          {lists.length > 0 && (
            <FormField label="Choose a list" className="mt-6">
              <Select value={selectedListId || ''} onChange={(event) => setSelectedListId(Number(event.target.value))}>
                {lists.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          <div className="mt-6 grid gap-4">
            <FormField label="List title" required>
              <Input value={listForm.title} onChange={(event) => setListForm((prev) => ({ ...prev, title: event.target.value }))} />
            </FormField>
            <FormField label="Intro copy" required>
              <Textarea rows={4} value={listForm.intro_text} onChange={(event) => setListForm((prev) => ({ ...prev, intro_text: event.target.value }))} />
            </FormField>
            <FormField label="Parody disclaimer" required>
              <Textarea rows={4} value={listForm.parody_disclaimer} onChange={(event) => setListForm((prev) => ({ ...prev, parody_disclaimer: event.target.value }))} />
            </FormField>
            <div className="flex flex-wrap gap-4">
              <Checkbox
                checked={listForm.is_public}
                onChange={(event) => setListForm((prev) => ({ ...prev, is_public: event.target.checked }))}
                label="Public"
              />
              <Checkbox
                checked={listForm.is_active}
                onChange={(event) => setListForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                label="Active"
              />
            </div>
            <Button variant="forest" onClick={saveList} loading={savingList}>
              Save list
            </Button>
          </div>
        </Card>

        <Card padding="lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Item editor</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                Satire + impact mapping
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedItemId(null);
                setItemForm((prev) => ({
                  ...prev,
                  title: '',
                  parody_description: '',
                  image_url: '',
                  source_url: '',
                  source_site_name: '',
                  impact_title: '',
                  impact_description: '',
                }));
              }}
            >
              <Sparkles className="h-4 w-4" />
              New item
            </Button>
          </div>

          {selectedList?.items?.length ? (
            <FormField label="Choose an item" className="mt-6">
              <Select value={selectedItemId || ''} onChange={(event) => setSelectedItemId(Number(event.target.value))}>
                {selectedList.items.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FormField label="Store source URL" className="md:col-span-2">
              <div className="flex flex-col gap-3 md:flex-row">
                <Input
                  placeholder="https://store.example/item"
                  value={itemForm.source_url}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, source_url: event.target.value }))}
                />
                <Button type="button" variant="outline" onClick={importSource} loading={importingSource} className="md:min-w-[180px]">
                  <ImagePlus className="h-4 w-4" />
                  Import listing
                </Button>
              </div>
            </FormField>

            {(itemForm.source_site_name || itemForm.source_url) && (
              <div className="md:col-span-2 rounded-[1.2rem] border border-[rgba(30,2,39,0.12)] bg-[rgba(246,212,203,0.92)] px-4 py-3 text-sm text-[var(--color-earth-medium)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Imported source</p>
                    <p className="mt-1 font-medium text-[var(--color-earth-dark)]">
                      {itemForm.source_site_name || 'Store listing'}
                    </p>
                  </div>
                  {itemForm.source_url ? (
                    <a
                      href={itemForm.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-institutional)]"
                    >
                      Open source
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            )}

            <FormField label="Image URL" className="md:col-span-2">
              <Input
                placeholder="https://images.example/item.jpg"
                value={itemForm.image_url}
                onChange={(event) => setItemForm((prev) => ({ ...prev, image_url: event.target.value }))}
              />
            </FormField>

            {itemForm.image_url ? (
              <div className="md:col-span-2 rounded-[1.5rem] border border-[rgba(30,2,39,0.12)] bg-[linear-gradient(180deg,rgba(246,212,203,0.98),rgba(246,212,203,0.94))] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Image preview</p>
                <div className="mt-3 flex min-h-[220px] items-center justify-center rounded-[1.25rem] bg-[radial-gradient(circle_at_top,rgba(246,212,203,0.95),rgba(246,212,203,0.9))] p-4">
                  <Image
                    src={itemForm.image_url}
                    alt={itemForm.title || 'Wishlist item preview'}
                    width={480}
                    height={240}
                    unoptimized
                    className="max-h-[240px] w-auto max-w-full object-contain drop-shadow-[0_20px_20px_rgba(30,2,39,0.18)]"
                  />
                </div>
              </div>
            ) : null}

            <FormField label="Wishlist title" required className="md:col-span-2">
              <Input value={itemForm.title} onChange={(event) => setItemForm((prev) => ({ ...prev, title: event.target.value }))} />
            </FormField>
            <FormField label="Wishlist note / description" required className="md:col-span-2">
              <Textarea rows={4} value={itemForm.parody_description} onChange={(event) => setItemForm((prev) => ({ ...prev, parody_description: event.target.value }))} />
            </FormField>
            <FormField label="Visual token">
              <Input value={itemForm.icon_key} onChange={(event) => setItemForm((prev) => ({ ...prev, icon_key: event.target.value }))} />
            </FormField>
            <FormField label="Price (cents)" required>
              <Input type="number" value={itemForm.price_cents} onChange={(event) => setItemForm((prev) => ({ ...prev, price_cents: Number(event.target.value) }))} />
            </FormField>
            <FormField label="Actually funds" required className="md:col-span-2">
              <Input value={itemForm.impact_title} onChange={(event) => setItemForm((prev) => ({ ...prev, impact_title: event.target.value }))} />
            </FormField>
            <FormField label="Impact description" required className="md:col-span-2">
              <Textarea rows={4} value={itemForm.impact_description} onChange={(event) => setItemForm((prev) => ({ ...prev, impact_description: event.target.value }))} />
            </FormField>
            <FormField label="Destination pool" required>
              <Select
                value={itemForm.mutual_aid_pool_id}
                onChange={(event) => setItemForm((prev) => ({ ...prev, mutual_aid_pool_id: Number(event.target.value) }))}
              >
                {pools.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Quantity limit">
              <Input
                type="number"
                value={itemForm.quantity_limit ?? ''}
                onChange={(event) =>
                  setItemForm((prev) => ({
                    ...prev,
                    quantity_limit: event.target.value ? Number(event.target.value) : null,
                  }))
                }
              />
            </FormField>
            <div className="md:col-span-2">
              <Checkbox
                checked={itemForm.is_active}
                onChange={(event) => setItemForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                label="Item active"
              />
            </div>
            <Button variant="forest" onClick={saveItem} loading={savingItem} className="md:col-span-2">
              Save item
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
