import Link from 'next/link';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export type AnuPanelTone = 'shell' | 'soft' | 'quiet';
export type AnuChipTone = 'signal' | 'muted' | 'accent';
export type AnuActionTone = 'primary' | 'secondary' | 'ghost';
export type AnuControlTone = 'default' | 'active' | 'warning';
export type AnuInstrumentationTone = 'steady' | 'signal' | 'warning';
export type AnuChamberTone = 'default' | 'affirmed' | 'alert';

interface AnuSurfacePanelProps {
  children: ReactNode;
  tone?: AnuPanelTone;
  className?: string;
}

const panelToneClasses: Record<AnuPanelTone, string> = {
  shell: 'anu-surface-panel',
  soft: 'anu-surface-panel-soft',
  quiet: 'anu-surface-panel-quiet',
};

export function AnuSurfacePanel({ children, tone = 'shell', className }: AnuSurfacePanelProps) {
  return <div className={joinClasses(panelToneClasses[tone], className)}>{children}</div>;
}

interface AnuChipProps {
  children: ReactNode;
  tone?: AnuChipTone;
  icon?: LucideIcon;
  className?: string;
}

const chipToneClasses: Record<AnuChipTone, string> = {
  signal: 'anu-surface-chip',
  muted: 'anu-surface-chip anu-surface-chip-muted',
  accent: 'anu-surface-chip anu-surface-chip-accent',
};

export function AnuChip({ children, tone = 'signal', icon: Icon, className }: AnuChipProps) {
  return (
    <span className={joinClasses(chipToneClasses[tone], className)}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      <span>{children}</span>
    </span>
  );
}

interface AnuActionLinkProps {
  href: string;
  children: ReactNode;
  tone?: AnuActionTone;
  iconLeft?: LucideIcon;
  iconRight?: LucideIcon;
  className?: string;
}

const actionToneClasses: Record<AnuActionTone, string> = {
  primary: 'anu-action-link anu-action-link-primary',
  secondary: 'anu-action-link anu-action-link-secondary',
  ghost: 'anu-action-link anu-action-link-ghost',
};

const controlToneClasses: Record<AnuControlTone, string> = {
  default: 'anu-filter-button',
  active: 'anu-filter-button anu-filter-button-active',
  warning: 'anu-filter-button anu-filter-button-warning',
};

const instrumentationToneClasses: Record<AnuInstrumentationTone, string> = {
  steady: 'anu-instrument-card',
  signal: 'anu-instrument-card anu-instrument-card-signal',
  warning: 'anu-instrument-card anu-instrument-card-warning',
};

const chamberToneClasses: Record<AnuChamberTone, string> = {
  default: 'anu-chamber-card',
  affirmed: 'anu-chamber-card anu-chamber-card-affirmed',
  alert: 'anu-chamber-card anu-chamber-card-alert',
};

export function AnuActionLink({
  href,
  children,
  tone = 'secondary',
  iconLeft: IconLeft,
  iconRight: IconRight,
  className,
}: AnuActionLinkProps) {
  return (
    <Link href={href} className={joinClasses(actionToneClasses[tone], className)}>
      {IconLeft ? <IconLeft className="h-4 w-4" /> : null}
      <span>{children}</span>
      {IconRight ? <IconRight className="h-4 w-4" /> : null}
    </Link>
  );
}

interface AnuControlButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: AnuControlTone;
  iconLeft?: LucideIcon;
  iconRight?: LucideIcon;
}

export function AnuControlButton({
  children,
  tone = 'default',
  iconLeft: IconLeft,
  iconRight: IconRight,
  className,
  type = 'button',
  ...props
}: AnuControlButtonProps) {
  return (
    <button type={type} className={joinClasses(controlToneClasses[tone], className)} {...props}>
      {IconLeft ? <IconLeft className="h-4 w-4" /> : null}
      <span>{children}</span>
      {IconRight ? <IconRight className="h-4 w-4" /> : null}
    </button>
  );
}

interface AnuControlLinkProps {
  href: string;
  children: ReactNode;
  tone?: AnuControlTone;
  iconLeft?: LucideIcon;
  iconRight?: LucideIcon;
  className?: string;
}

export function AnuControlLink({
  href,
  children,
  tone = 'default',
  iconLeft: IconLeft,
  iconRight: IconRight,
  className,
}: AnuControlLinkProps) {
  return (
    <Link href={href} className={joinClasses(controlToneClasses[tone], className)}>
      {IconLeft ? <IconLeft className="h-4 w-4" /> : null}
      <span>{children}</span>
      {IconRight ? <IconRight className="h-4 w-4" /> : null}
    </Link>
  );
}

interface AnuFilterBarProps {
  children: ReactNode;
  className?: string;
}

export function AnuFilterBar({ children, className }: AnuFilterBarProps) {
  return <div className={joinClasses('anu-filter-bar', className)}>{children}</div>;
}

interface AnuFilterGroupProps {
  children: ReactNode;
  className?: string;
}

export function AnuFilterGroup({ children, className }: AnuFilterGroupProps) {
  return <div className={joinClasses('anu-filter-group', className)}>{children}</div>;
}

interface AnuFilterInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function AnuFilterInput({ className, ...props }: AnuFilterInputProps) {
  return <input className={joinClasses('anu-filter-input', className)} {...props} />;
}

interface AnuHeroMetricProps {
  label: string;
  value: string;
  detail?: string;
}

export function AnuHeroMetric({ label, value, detail }: AnuHeroMetricProps) {
  return (
    <div className="anu-surface-metric">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-slate-300/78">{detail}</p> : null}
    </div>
  );
}

interface AnuInstrumentationCardProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: LucideIcon;
  tone?: AnuInstrumentationTone;
  footer?: ReactNode;
  className?: string;
}

export function AnuInstrumentationCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'steady',
  footer,
  className,
}: AnuInstrumentationCardProps) {
  return (
    <article className={joinClasses(instrumentationToneClasses[tone], className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
        </div>
        {Icon ? (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[#f1d3a1]">
            <Icon className="h-4.5 w-4.5" />
          </span>
        ) : null}
      </div>
      {detail ? <p className="mt-3 text-sm leading-6 text-slate-300/82">{detail}</p> : null}
      {footer ? <div className="mt-4 border-t border-white/10 pt-4 text-sm text-slate-200/84">{footer}</div> : null}
    </article>
  );
}

interface AnuSectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function AnuSectionHeading({ eyebrow, title, description, action }: AnuSectionHeadingProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="anu-lab-kicker">{eyebrow}</p>
        <h2 className="mt-2 text-3xl text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
          {title}
        </h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300/82">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

interface AnuChamberCardProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  tone?: AnuChamberTone;
  className?: string;
}

export function AnuChamberCard({
  eyebrow,
  title,
  description,
  action,
  children,
  tone = 'default',
  className,
}: AnuChamberCardProps) {
  return (
    <article className={joinClasses(chamberToneClasses[tone], className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          {eyebrow ? <p className="anu-lab-kicker">{eyebrow}</p> : null}
          <h3 className="mt-2 text-2xl text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
            {title}
          </h3>
          {description ? <div className="mt-3 text-sm leading-6 text-slate-300/84">{description}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </article>
  );
}

interface AnuPageHeroProps {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function AnuPageHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
  children,
  className,
}: AnuPageHeroProps) {
  return (
    <section className={joinClasses('anu-route-hero', className)}>
      <div className={joinClasses('grid gap-8', aside ? 'xl:grid-cols-[1.12fr_0.88fr]' : '')}>
        <div className="min-w-0">
          <p className="anu-lab-kicker">{eyebrow}</p>
          <div
            className="mt-3 text-4xl leading-[1.02] text-white md:text-[3.35rem]"
            style={{ fontFamily: 'var(--anu-type-display)' }}
          >
            {title}
          </div>
          <div className="mt-5 max-w-3xl text-base leading-relaxed text-slate-200/88 md:text-lg">{description}</div>
          {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
          {children ? <div className="mt-8">{children}</div> : null}
        </div>
        {aside ? <div className="min-w-0">{aside}</div> : null}
      </div>
    </section>
  );
}
