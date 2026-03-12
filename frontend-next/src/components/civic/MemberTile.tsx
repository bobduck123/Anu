'use client';

import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Star, Award, Shield, Heart, Leaf } from 'lucide-react';
import Image from 'next/image';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type MemberRole = 'participant' | 'organizer' | 'validator' | 'case_worker' |
                  'relief_moderator' | 'auditor' | 'board_member' | 'node_admin' |
                  'node_curator' | 'treasury_guardian' | 'governance';

interface MemberTileProps {
  name: string;
  pseudonym: string;
  role: MemberRole;
  impactScore: number;
  tier: 'seed' | 'sapling' | 'oak' | 'redwood';
  streakMonths: number;
  avatarUrl?: string;
  index: number;
}

const roleConfig: Record<MemberRole, { label: string; color: string; icon: typeof Star }> = {
  participant: { label: 'Member', color: 'rgb(var(--color-sage))', icon: Heart },
  organizer: { label: 'Organizer', color: 'rgb(var(--color-forest))', icon: Star },
  validator: { label: 'Validator', color: 'rgb(var(--color-institutional))', icon: Shield },
  case_worker: { label: 'Case Worker', color: 'rgb(var(--color-accent))', icon: Heart },
  relief_moderator: { label: 'Moderator', color: '#dc2626', icon: Shield },
  auditor: { label: 'Auditor', color: 'rgb(var(--color-earth-medium))', icon: Shield },
  board_member: { label: 'Board', color: 'rgb(var(--color-institutional))', icon: Award },
  node_admin: { label: 'Admin', color: 'rgb(var(--color-earth-dark))', icon: Award },
  node_curator: { label: 'Curator', color: 'rgb(var(--color-institutional))', icon: Award },
  treasury_guardian: { label: 'Treasury', color: 'rgb(var(--color-forest))', icon: Shield },
  governance: { label: 'Governance', color: 'rgb(var(--color-institutional))', icon: Award },
};

const tierConfig = {
  seed: { label: 'Seed', color: '#d4c4b7', icon: Leaf },
  sapling: { label: 'Sapling', color: 'rgb(var(--color-sage))', icon: Leaf },
  oak: { label: 'Oak', color: 'rgb(var(--color-forest))', icon: Leaf },
  redwood: { label: 'Redwood', color: 'rgb(var(--color-institutional))', icon: Leaf },
};

// Generate avatar initials from pseudonym
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Generate consistent color from string
function stringToColor(str: string): string {
  const colors = [
    'rgb(var(--color-sage))',
    'rgb(var(--color-forest))',
    'rgb(var(--color-institutional))',
    'rgb(var(--color-accent))',
    'rgb(var(--color-earth-medium))',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function MemberTile({
  name,
  pseudonym,
  role,
  impactScore,
  tier,
  streakMonths,
  avatarUrl,
  index,
}: MemberTileProps) {
  const tileRef = useRef<HTMLDivElement>(null);
  
  const roleInfo = roleConfig[role] || roleConfig.participant;
  const tierInfo = tierConfig[tier] || tierConfig.seed;
  const RoleIcon = roleInfo.icon;
  const TierIcon = tierInfo.icon;
  
  const avatarColor = stringToColor(pseudonym);

  useEffect(() => {
    if (typeof window === 'undefined' || !tileRef.current) return;

    // Staggered entrance animation
    gsap.fromTo(tileRef.current,
      { y: 30, opacity: 0, scale: 0.95 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: 'power2.out',
        delay: index * 0.08,
        scrollTrigger: {
          trigger: tileRef.current,
          start: 'top 90%',
          once: true
        }
      }
    );
  }, [index]);

  return (
    <div 
      ref={tileRef}
      className="group relative bg-white rounded-xl p-5 border border-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer"
    >
      {/* Role-colored border on hover */}
      <div 
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ 
          boxShadow: `inset 0 0 0 2px ${roleInfo.color}`,
        }}
      />

      <div className="flex items-center gap-4">
        {/* Avatar with circular mask */}
        <div className="relative">
          <div 
            className="circular-mask w-14 h-14 flex items-center justify-center text-white font-semibold text-lg"
            style={{ backgroundColor: avatarColor }}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={pseudonym}
                width={56}
                height={56}
                unoptimized
                className="w-full h-full object-cover"
              />
            ) : (
              getInitials(pseudonym)
            )}
          </div>
          
          {/* Role indicator dot */}
          <div 
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
            style={{ backgroundColor: roleInfo.color }}
          >
            <RoleIcon className="w-2.5 h-2.5 text-white" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4
            className="font-semibold text-earth-dark truncate group-hover:text-[rgb(var(--color-institutional))] transition-colors"
            title={name}
          >
            {pseudonym}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span 
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: roleInfo.color + '15',
                color: roleInfo.color 
              }}
            >
              {roleInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Impact Score & Streak */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          {/* Impact Score Badge */}
          <div className="flex items-center gap-2">
            <div 
              className="p-1.5 rounded-lg"
              style={{ backgroundColor: tierInfo.color + '15' }}
            >
              <TierIcon className="w-3.5 h-3.5" style={{ color: tierInfo.color }} />
            </div>
            <div>
              <div className="text-xs text-earth-medium">Impact</div>
              <div className="font-semibold text-earth-dark font-mono-data">
                {impactScore.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Streak */}
          {streakMonths > 0 && (
            <div className="flex items-center gap-1.5 text-earth-medium">
              <div className="flex">
                {[...Array(Math.min(streakMonths, 3))].map((_, i) => (
                  <div 
                    key={i}
                    className="w-2 h-2 rounded-full bg-[rgb(var(--color-accent))] -ml-1 first:ml-0"
                  />
                ))}
              </div>
              <span className="text-xs">
                {streakMonths}m streak
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tier Label */}
      <div 
        className="absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ 
          backgroundColor: tierInfo.color + '15',
          color: tierInfo.color 
        }}
      >
        {tierInfo.label}
      </div>
    </div>
  );
}
