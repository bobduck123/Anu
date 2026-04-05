'use client';

import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { api, Product, CartItem } from '@/lib/api';
import { getCoreApiBase } from '@/lib/runtime';
import { Plus, X, ShoppingCart, Store } from 'lucide-react';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { ErrorState } from '@/ui-system/states/ErrorState';
import { BentoGrid, BentoHero, BentoStat, BentoStyles } from '@/ui/patterns/chromatic-bento';

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [showCart, setShowCart] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '', description: '', price: 0, category: '',
    impact: 'environmental', imageUrl: '', inStock: true
  });

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => {
    setFilteredProducts(category === 'all' ? products : products.filter(p => p.category === category));
  }, [products, category]);

  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {
    setError(null);
    try { setProducts(await api.marketplace.getProducts()); }
    catch { setError('Failed to load products.'); }
    finally { setLoading(false); }
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { productId: product.id, quantity: 1, product }]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) setCart(cart.filter(item => item.productId !== productId));
    else setCart(cart.map(item => item.productId === productId ? { ...item, quantity } : item));
  };

  const getTotal = () => cart.reduce((t, item) => t + (item.product.price * item.quantity), 0);

  const handleCheckout = async () => {
    try {
      const session = await api.marketplace.createCheckoutSession(cart);
      if (session.url) { window.location.href = session.url; return; }
      if (session.id) window.location.href = `${getCoreApiBase()}/checkout/${session.id}`;
    } catch { /* ignore */ }
  };

  const handleCreateProduct = async () => {
    if (!productForm.name.trim() || !productForm.description.trim() || !productForm.category.trim()) { alert('Please fill in all required fields'); return; }
    if (productForm.price <= 0) { alert('Please enter a valid price'); return; }
    setIsCreatingProduct(true);
    try {
      const newProduct = await api.marketplace.createProduct(productForm);
      setProducts(prev => [newProduct, ...prev]);
      setProductForm({ name: '', description: '', price: 0, category: '', impact: 'environmental', imageUrl: '', inStock: true });
      setShowCreateProduct(false);
    } catch { alert('Failed to create product.'); }
    finally { setIsCreatingProduct(false); }
  };

  if (loading) return <LoadingState fullPage message="Loading marketplace..." />;
  if (error) return <ErrorState message={error} onRetry={loadProducts} />;

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BentoStyles />
        <BentoGrid columns={12} rowHeight={80} gap={12} className="mb-8">
          <BentoHero
            title="Marketplace"
            subtitle="Discover sustainable products and support eco-friendly businesses"
            metric={String(products.length)}
            metricLabel="products"
            colSpan={7}
            rowSpan={2}
          />
          <BentoStat label="Categories" value={categories.length - 1} colSpan={5} rowSpan={1} stagger={1} />
          <BentoStat
            label="Cart Total"
            value={`$${getTotal().toFixed(2)}`}
            colSpan={5}
            rowSpan={1}
            stagger={2}
          />
        </BentoGrid>

        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`btn-pill text-sm ${category === cat ? 'btn-pill-accent' : 'btn-pill-outline'}`}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCreateProduct(true)} className="btn-pill btn-pill-sage text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> Sell Product
            </button>
            <button onClick={() => setShowCart(!showCart)}
              className="btn-pill btn-pill-primary text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Cart ({cart.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product, index) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }} className="card-civic overflow-hidden p-0">
                  <Image src={product.imageUrl || '/window.svg'} alt={product.name} width={640} height={384}
                    unoptimized className="h-48 w-full object-cover" />
                  <div className="p-5">
                    <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>{product.name}</h3>
                    <p className="text-[var(--color-muted-foreground)] mb-4 line-clamp-3 text-sm">{product.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold font-mono-data text-[var(--color-accent)]">${product.price}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        product.inStock ? 'bg-[var(--color-sage-light)] text-[var(--color-forest)]' : 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'
                      }`}>
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-muted-foreground)] mb-4">Impact: {product.impact}</p>
                    <button onClick={() => addToCart(product)} disabled={!product.inStock}
                      className={`w-full btn-pill text-sm ${product.inStock ? 'btn-pill-sage' : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] cursor-not-allowed rounded-full px-4 py-2'}`}>
                      {product.inStock ? 'Add to Cart' : 'Unavailable'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <EmptyState icon={Store} title="No products found" description="Try changing the category filter or check back later." />
            )}
          </div>

          {showCart && (
            <motion.div initial={{ x: 300 }} animate={{ x: 0 }} className="card-civic h-fit">
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Your Cart</h3>
              {cart.length === 0 ? (
                <p className="text-[var(--color-muted-foreground)]">Your cart is empty</p>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map(item => (
                      <div key={item.productId} className="flex items-center space-x-3">
                        <Image src={item.product.imageUrl || '/window.svg'} alt={item.product.name}
                          width={64} height={64} unoptimized className="h-14 w-14 rounded object-cover" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{item.product.name}</h4>
                          <p className="text-[var(--color-muted-foreground)] text-sm font-mono-data">${item.product.price}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-7 h-7 bg-[var(--color-muted)] rounded text-sm">-</button>
                          <span className="w-6 text-center text-sm font-mono-data">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-7 h-7 bg-[var(--color-muted)] rounded text-sm">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[var(--color-border)] pt-4">
                    <div className="flex justify-between mb-4">
                      <span className="font-semibold">Total:</span>
                      <span className="font-bold text-lg font-mono-data">${getTotal().toFixed(2)}</span>
                    </div>
                    <button onClick={handleCheckout} className="w-full btn-pill btn-pill-primary">Checkout</button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </div>

        {/* Create Product Modal */}
        {showCreateProduct && (
          <div className="fixed inset-0 bg-[color:rgba(30,2,39,0.5)] flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-[var(--color-card)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>Sell Your Product</h2>
                  <button onClick={() => setShowCreateProduct(false)}>
                    <X className="h-6 w-6 text-[var(--color-muted-foreground)]" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Product Name *</label>
                    <input type="text" value={productForm.name}
                      onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description *</label>
                    <textarea rows={4} value={productForm.description}
                      onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Price *</label>
                      <input type="number" min="0" step="0.01" value={productForm.price}
                        onChange={e => setProductForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg font-mono-data" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Category *</label>
                      <input type="text" value={productForm.category}
                        onChange={e => setProductForm(p => ({ ...p, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Impact</label>
                      <select value={productForm.impact}
                        onChange={e => setProductForm(p => ({ ...p, impact: e.target.value }))}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
                        <option value="environmental">Environmental</option>
                        <option value="social">Social</option>
                        <option value="economic">Economic</option>
                        <option value="educational">Educational</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Stock</label>
                      <select value={productForm.inStock.toString()}
                        onChange={e => setProductForm(p => ({ ...p, inStock: e.target.value === 'true' }))}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
                        <option value="true">In Stock</option>
                        <option value="false">Out of Stock</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Image URL</label>
                    <input type="url" value={productForm.imageUrl}
                      onChange={e => setProductForm(p => ({ ...p, imageUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setShowCreateProduct(false)} className="btn-pill btn-pill-outline">Cancel</button>
                    <button onClick={handleCreateProduct} disabled={isCreatingProduct}
                      className="btn-pill btn-pill-sage disabled:opacity-50">
                      {isCreatingProduct ? 'Creating...' : 'Create Product'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
