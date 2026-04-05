'use client';

import Image from 'next/image';

interface MemberRowProps {
  pseudonym: string;
  role: string;
  impactScore: number;
  avatarUrl?: string;
  isOnline?: boolean;
}

const roleStyles: Record<string, string> = {
  validator: 'text-primary bg-primary-light',
  organizer: 'text-secondary bg-secondary-light',
  participant: 'text-tertiary bg-tertiary-light',
  'case_worker': 'text-highlight bg-highlight-light',
  auditor: 'text-text-secondary bg-surface',
  board_member: 'text-primary bg-primary-light',
};

export function MemberRow({
  pseudonym,
  role,
  impactScore,
  avatarUrl,
  isOnline,
}: MemberRowProps) {
  const roleClass = roleStyles[role] || roleStyles.participant;
  const displayRole = role.replace('_', ' ');
  
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-surface transition-colors">
      {/* Avatar */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-text font-medium text-lg">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={pseudonym}
              width={48}
              height={48}
              unoptimized
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            pseudonym.charAt(0).toUpperCase()
          )}
        </div>
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-tertiary border-2 border-[var(--color-foreground)] rounded-full" />
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="body font-medium text-text truncate">{pseudonym}</h4>
        <span className={`label inline-block mt-1 px-2 py-0.5 rounded ${roleClass}`}>
          {displayRole}
        </span>
      </div>
      
      {/* Impact Score */}
      <div className="text-right">
        <span className="metric-small text-text block">{impactScore.toLocaleString()}</span>
        <span className="text-xs text-text-muted">impact</span>
      </div>
    </div>
  );
}
