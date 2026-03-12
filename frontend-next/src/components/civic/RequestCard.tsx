'use client';

interface RequestCardProps {
  id: string;
  amount: number;
  purpose: string;
  status: 'pending' | 'reviewing' | 'approved' | 'completed';
  submittedAt: string;
  anonId: string;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    className: 'text-highlight bg-highlight-light',
  },
  reviewing: {
    label: 'Under Review',
    className: 'text-primary bg-primary-light',
  },
  approved: {
    label: 'Approved',
    className: 'text-tertiary bg-tertiary-light',
  },
  completed: {
    label: 'Completed',
    className: 'text-text-secondary bg-surface',
  },
};

export function RequestCard({
  amount,
  purpose,
  status,
  submittedAt,
  anonId,
}: RequestCardProps) {
  const config = statusConfig[status];
  
  return (
    <div className="bg-white rounded-lg p-5 hover:bg-surface transition-colors">
      {/* Amount and Status */}
      <div className="flex items-center justify-between mb-3">
        <span className="metric text-text">${amount.toLocaleString()}</span>
        <span className={`label px-2.5 py-1 rounded-full ${config.className}`}>
          {config.label}
        </span>
      </div>
      
      {/* Purpose */}
      <p className="body text-text mb-4">{purpose}</p>
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <span className="metric-small text-text-muted">#{anonId}</span>
        <span className="body-small text-text-secondary">{submittedAt}</span>
      </div>
    </div>
  );
}
