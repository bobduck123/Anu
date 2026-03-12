'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TrendingUp, TrendingDown, ArrowUpRight, Heart, Shield, Sprout } from 'lucide-react';
import Link from 'next/link';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface ImpactPoolCardProps {
  name: string;
  description: string;
  balance: number;
  targetAmount?: number;
  allocationPercent: number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  color: 'sage' | 'forest' | 'institutional' | 'accent';
  icon: 'heart' | 'shield' | 'sprout';
  sparklineData: number[];
}

const colorMap = {
  sage: { bg: 'rgb(var(--color-sage))', light: 'rgba(135, 168, 120, 0.1)' },
  forest: { bg: 'rgb(var(--color-forest))', light: 'rgba(45, 90, 61, 0.1)' },
  institutional: { bg: 'rgb(var(--color-institutional))', light: 'rgba(30, 58, 95, 0.1)' },
  accent: { bg: 'rgb(var(--color-accent))', light: 'rgba(217, 119, 6, 0.1)' },
};

const iconMap = {
  heart: Heart,
  shield: Shield,
  sprout: Sprout,
};

// Generate SVG sparkline path
function generateSparklinePath(data: number[]): string {
  if (data.length < 2) return '';
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const width = 200;
  const height = 48;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });
  
  return `M ${points.join(' L ')}`;
}

// Donut Chart Component
function DonutChart({ 
  percent, 
  color,
  size = 80,
  strokeWidth = 8
}: { 
  percent: number; 
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-200"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transition: 'stroke-dashoffset 1s ease-out'
        }}
      />
    </svg>
  );
}

export function ImpactPoolCard({
  name,
  description,
  balance,
  targetAmount,
  allocationPercent,
  trend,
  trendValue,
  color,
  icon,
  sparklineData,
}: ImpactPoolCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  const Icon = iconMap[icon];
  const colors = colorMap[color];

  useEffect(() => {
    if (typeof window === 'undefined' || !cardRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          
          // Animate counter
          if (counterRef.current) {
            gsap.fromTo({ value: 0 },
              { value: balance },
              {
                duration: 1.5,
                ease: 'power2.out',
                onUpdate: function() {
                  if (counterRef.current) {
                    counterRef.current.textContent = '$' + Math.round(this.targets()[0].value).toLocaleString();
                  }
                }
              }
            );
          }
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [balance, isVisible]);

  const sparklinePath = generateSparklinePath(sparklineData);

  return (
    <div 
      ref={cardRef}
      className="card-civic group cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div 
            className="p-3 rounded-xl"
            style={{ backgroundColor: colors.light }}
          >
            <Icon className="w-5 h-5" style={{ color: colors.bg }} />
          </div>
          <div>
            <h3 
              className="font-semibold text-lg text-earth-dark"
              style={{ fontFamily: 'var(--font-source-serif), Georgia, serif' }}
            >
              {name}
            </h3>
            <p className="text-sm text-earth-medium">{description}</p>
          </div>
        </div>
        
        {/* Donut Chart */}
        <div className="relative">
          <DonutChart 
            percent={isVisible ? allocationPercent : 0} 
            color={colors.bg}
            size={64}
            strokeWidth={6}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-earth-dark">
              {allocationPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="mb-4">
        <span 
          ref={counterRef}
          className="text-3xl font-semibold text-earth-dark font-mono-data"
        >
          $0
        </span>
        {targetAmount && (
          <span className="text-sm text-earth-medium ml-2">
            of ${targetAmount.toLocaleString()} target
          </span>
        )}
      </div>

      {/* Sparkline */}
      <div className="h-12 mb-4">
        <svg 
          viewBox="0 0 200 48" 
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`gradient-${name}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.bg} stopOpacity="0.3" />
              <stop offset="100%" stopColor={colors.bg} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Area fill */}
          <path
            d={`${sparklinePath} L 200,48 L 0,48 Z`}
            fill={`url(#gradient-${name})`}
          />
          {/* Line */}
          <path
            d={sparklinePath}
            fill="none"
            stroke={colors.bg}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className={`flex items-center gap-1 text-sm ${
          trend === 'up' ? 'text-green-600' : 
          trend === 'down' ? 'text-red-600' : 'text-gray-500'
        }`}>
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4" />
          ) : trend === 'down' ? (
            <TrendingDown className="w-4 h-4" />
          ) : null}
          <span>{trendValue}</span>
        </div>
        
        <Link 
          href={`/pools/${name.toLowerCase().replace(/\s+/g, '-')}`}
          className="flex items-center gap-1 text-sm font-medium text-[rgb(var(--color-institutional))] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          View details
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
