'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, User, Heart, BarChart3, Droplets, Users, MapPin, Wallet, GraduationCap, Eye, Compass, LayoutGrid, Shield, Sparkles, Leaf } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ManaraMark from '@/components/branding/ManaraMark';
import { brand } from '@/lib/brand';

const navStructure = {
  top: [
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/intel-feed', label: 'Intel Feed', icon: Sparkles },
    { href: '/learn', label: 'Learn', icon: GraduationCap },
    { href: '/quests', label: 'Quests', icon: Heart },
    { href: '/cost-lowering', label: 'Cost Lowering', icon: Leaf },
    { href: '/earth', label: 'Earth', icon: Leaf },
    { href: '/impact', label: 'Impact', icon: BarChart3 },
    { href: '/discover', label: 'Discover', icon: Compass },
    { href: '/teams', label: 'Teams', icon: Users },
    { href: '/packs', label: 'Packs', icon: MapPin },
    { href: '/assets', label: 'Assets', icon: LayoutGrid },
    { href: '/insights', label: 'Insights', icon: Sparkles },
    { href: '/merchants', label: 'Merchants', icon: Wallet },
    { href: '/education', label: 'Education', icon: GraduationCap },
    { href: '/transparency', label: 'Transparency', icon: Eye },
    { href: '/pools', label: 'Pools', icon: Droplets },
  ],
  discover: [
    { href: '/actions', label: 'Actions', icon: Heart },
    { href: '/events', label: 'Events', icon: BarChart3 },
  ],
  community: [
    { href: '/community', label: 'Hub', icon: LayoutGrid },
    { href: '/community#microcosms', label: 'Microcosms', icon: Users },
    { href: '/constellations', label: 'Constellations', icon: Sparkles },
  ],
  profile: [],
  admin: [
    { href: '/governance/capital', label: 'Capital', icon: BarChart3 },
    { href: '/governance/formulas', label: 'Formulas', icon: BarChart3 },
    { href: '/governance/metrics-registry', label: 'Metrics', icon: BarChart3 },
    { href: '/governance/model-registry', label: 'Models', icon: BarChart3 },
    { href: '/governance/competency', label: 'Competency Admin', icon: GraduationCap },
    { href: '/admin/education', label: 'Education Admin', icon: GraduationCap },
    { href: '/governance/needs', label: 'Needs', icon: Eye },
    { href: '/governance/collisions', label: 'Collisions', icon: Eye },
    { href: '/governance/sovereignty', label: 'Sovereignty', icon: Eye },
    { href: '/governance/simulations', label: 'Simulations', icon: Users },
    { href: '/governance/systemic', label: 'Systemic Shock', icon: Shield },
    { href: '/governance/systemic/simulations', label: 'Systemic Sim', icon: Shield },
    { href: '/governance/federation', label: 'Federation', icon: MapPin },
    { href: '/governance/institutional', label: 'Institutional', icon: Shield },
    { href: '/admin/constellations', label: 'Constellation Alerts', icon: Shield },
    { href: '/admin/crisis-sim', label: 'Crisis Sim', icon: Shield },
  ],
};

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const positionClass = isLanding ? 'fixed top-0' : 'sticky top-0';

  const organizerRoles = new Set(['organizer', 'node_admin', 'platform_admin', 'board_member', 'treasury_guardian']);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const profileLinks = [
    { href: '/profile', label: 'Profile' },
    { href: '/pledges', label: 'My Pledges' },
    { href: '/dashboard/savings', label: 'Savings' },
    ...(isAuthenticated && organizerRoles.has(user?.role || '') ? [
      { href: '/organizer', label: 'Organiser' },
      { href: '/organizer/intelligence', label: 'Cockpit' },
      { href: '/memberships', label: 'Memberships' },
      { href: '/organizer/competency', label: 'Competencies' },
    ] : []),
  ];

  return (
    <nav
      className={`${positionClass} left-0 right-0 z-40 transition-all duration-500 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md shadow-sm py-3'
          : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group focus-ring rounded-lg"
          aria-label={`${brand.name} Home`}
        >
          <ManaraMark className="h-10 w-10" />
          <span
            className="font-semibold text-lg tracking-tight transition-colors duration-300 text-[var(--color-earth-dark)]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {brand.name}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {navStructure.top.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-300 focus-ring text-[var(--color-earth-dark)] hover:text-[var(--color-institutional)] hover:bg-[var(--color-institutional-light)]"
            >
              {link.label}
            </Link>
          ))}
          <div className="relative">
            <button
              onClick={() => setDiscoverOpen((open) => !open)}
              className="text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-300 focus-ring text-[var(--color-earth-dark)] hover:text-[var(--color-institutional)] hover:bg-[var(--color-institutional-light)]"
            >
              <Compass className="w-4 h-4 inline-block mr-2" />
              Discover
            </button>
            {discoverOpen && (
              <div className="absolute left-0 mt-2 w-44 rounded-lg shadow-lg bg-white border border-[var(--color-border)] z-50">
                <div className="py-2">
                  {navStructure.discover.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block px-4 py-2 text-sm text-[var(--color-earth-dark)] hover:bg-[var(--color-institutional-light)]"
                      onClick={() => setDiscoverOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setCommunityOpen((open) => !open)}
              className="text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-300 focus-ring text-[var(--color-earth-dark)] hover:text-[var(--color-institutional)] hover:bg-[var(--color-institutional-light)]"
            >
              <Users className="w-4 h-4 inline-block mr-2" />
              Community
            </button>
            {communityOpen && (
              <div className="absolute left-0 mt-2 w-44 rounded-lg shadow-lg bg-white border border-[var(--color-border)] z-50">
                <div className="py-2">
                  {navStructure.community.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block px-4 py-2 text-sm text-[var(--color-earth-dark)] hover:bg-[var(--color-institutional-light)]"
                      onClick={() => setCommunityOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setAdminOpen((open) => !open)}
              className="text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-300 focus-ring text-[var(--color-earth-dark)] hover:text-[var(--color-institutional)] hover:bg-[var(--color-institutional-light)]"
            >
              <Shield className="w-4 h-4 inline-block mr-2" />
              Admin
            </button>
            {adminOpen && (
              <div className="absolute left-0 mt-2 w-56 rounded-lg shadow-lg bg-white border border-[var(--color-border)] z-50">
                <div className="py-2">
                  {navStructure.admin.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block px-4 py-2 text-sm text-[var(--color-earth-dark)] hover:bg-[var(--color-institutional-light)]"
                      onClick={() => setAdminOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTA / Profile */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/memberships"
            className="btn-pill btn-pill-primary text-sm"
          >
            <Heart className="w-4 h-4 mr-2" />
            Join Commons
          </Link>
          <div className="relative">
            <button
              onClick={() => setProfileOpen((open) => !open)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-300 focus-ring text-[var(--color-earth-dark)] hover:text-[var(--color-institutional)] hover:bg-[var(--color-institutional-light)]"
            >
              <User className="w-4 h-4 inline-block mr-2" />
              {isAuthenticated ? (user?.pseudonym || user?.username || 'Profile') : 'Sign in'}
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white border border-[var(--color-border)] z-50">
                <div className="py-2">
                  {isAuthenticated ? (
                    <>
                      {profileLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="block px-4 py-2 text-sm text-[var(--color-earth-dark)] hover:bg-[var(--color-institutional-light)]"
                          onClick={() => setProfileOpen(false)}
                        >
                          {link.label}
                        </Link>
                      ))}
                      <Link
                        href="/auth"
                        className="block px-4 py-2 text-sm text-[var(--color-earth-dark)] hover:bg-[var(--color-institutional-light)]"
                        onClick={() => setProfileOpen(false)}
                      >
                        Switch Account
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/auth"
                      className="block px-4 py-2 text-sm text-[var(--color-earth-dark)] hover:bg-[var(--color-institutional-light)]"
                      onClick={() => setProfileOpen(false)}
                    >
                      Login / Register
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 rounded-lg transition-colors focus-ring hover:bg-gray-100 text-[var(--color-earth-dark)]"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

        {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 bg-white shadow-lg transition-all duration-300 overflow-hidden ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 py-6 space-y-1">
          {navStructure.top.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-[var(--color-earth-dark)] hover:bg-[var(--color-institutional-light)] hover:text-[var(--color-institutional)] transition-colors"
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
          <div className="px-3 pt-3 text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Discover</div>
          {navStructure.discover.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-[var(--color-earth-dark)] hover:bg-[var(--color-institutional-light)] hover:text-[var(--color-institutional)] transition-colors"
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
          <div className="px-3 pt-3 text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Community</div>
          {navStructure.community.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-[var(--color-earth-dark)] hover:bg-[var(--color-institutional-light)] hover:text-[var(--color-institutional)] transition-colors"
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
          <div className="px-3 pt-3 text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Admin</div>
          {navStructure.admin.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-[var(--color-earth-dark)] hover:bg-[var(--color-institutional-light)] hover:text-[var(--color-institutional)] transition-colors"
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
          <div className="pt-4 border-t border-[var(--color-border)]">
            <div className="space-y-1 mb-3">
              {isAuthenticated ? (
                profileLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-[var(--color-earth-dark)] hover:bg-[var(--color-institutional-light)] hover:text-[var(--color-institutional)] transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                ))
              ) : (
                <Link
                  href="/auth"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-[var(--color-earth-dark)] hover:bg-[var(--color-institutional-light)] hover:text-[var(--color-institutional)] transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">Login / Register</span>
                </Link>
              )}
            </div>
            <Link
              href="/memberships"
              onClick={() => setIsOpen(false)}
              className="btn-pill btn-pill-primary w-full text-center"
            >
              <Heart className="w-4 h-4 mr-2" />
              Join Commons
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
