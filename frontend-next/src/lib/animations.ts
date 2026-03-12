'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Global defaults
gsap.defaults({
  ease: 'power2.out',
  duration: 0.6
});

// ==========================================
// PRELOADER SEQUENCE
// ==========================================
export const preloaderAnimation = () => {
  const tl = gsap.timeline();

  tl.from('.preloader-logo', {
    opacity: 0,
    y: 30,
    duration: 0.6,
    ease: 'power3.out'
  })
  .from('.preloader-text span', {
    opacity: 0,
    y: 20,
    stagger: 0.07,
    duration: 0.6,
    ease: 'power2.out'
  }, '-=0.3')
  .to('.preloader', {
    opacity: 0,
    y: -20,
    duration: 0.6,
    ease: 'power2.inOut',
    delay: 0.8,
    onComplete: () => {
      const preloader = document.querySelector('.preloader');
      if (preloader) {
        preloader.remove();
      }
      document.body.classList.add('site-ready');
    }
  });

  return tl;
};

// ==========================================
// SECTION REVEALS
// ==========================================
export const useSectionReveal = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sections = gsap.utils.toArray<HTMLElement>('.section-reveal');

    sections.forEach((section) => {
      gsap.from(section, {
        y: 60,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          end: 'top 50%',
          toggleActions: 'play none none reverse'
        }
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);
};

// ==========================================
// PARALLAX EFFECTS
// ==========================================
export const useParallax = (speed: number = 0.5) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !ref.current) return;

    const element = ref.current;

    gsap.to(element, {
      y: -100 * speed,
      ease: 'none',
      scrollTrigger: {
        trigger: element,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(st => {
        if (st.vars.trigger === element) st.kill();
      });
    };
  }, [speed]);

  return ref;
};

// ==========================================
// COUNTER ANIMATION
// ==========================================
export const animateCounter = (
  element: HTMLElement | null,
  targetValue: number,
  duration: number = 1.2,
  prefix: string = '',
  suffix: string = ''
) => {
  if (!element || typeof window === 'undefined') return;

  const obj = { value: 0 };

  return gsap.to(obj, {
    value: targetValue,
    duration,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: element,
      start: 'top 80%',
      once: true
    },
    onUpdate: () => {
      element.textContent = prefix + Math.round(obj.value).toLocaleString() + suffix;
    }
  });
};

// ==========================================
// USE COUNTER HOOK
// ==========================================
export const useCounter = (
  targetValue: number,
  prefix: string = '',
  suffix: string = ''
) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !ref.current) return;

    const element = ref.current;
    const obj = { value: 0 };

    const tween = gsap.to(obj, {
      value: targetValue,
      duration: 1.5,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: element,
        start: 'top 85%',
        once: true
      },
      onUpdate: () => {
        element.textContent = prefix + Math.round(obj.value).toLocaleString() + suffix;
      }
    });

    return () => {
      tween.kill();
    };
  }, [targetValue, prefix, suffix]);

  return ref;
};

// ==========================================
// MARQUEE
// ==========================================
export const initMarquee = () => {
  if (typeof window === 'undefined') return;

  gsap.to('.marquee-content', {
    xPercent: -50,
    duration: 30,
    ease: 'none',
    repeat: -1
  });
};

// ==========================================
// STAGGER ENTRANCE
// ==========================================
export const staggerEntrance = (
  elements: string | HTMLElement[],
  delay: number = 0.1
) => {
  if (typeof window === 'undefined') return;

  return gsap.from(elements, {
    y: 30,
    opacity: 0,
    stagger: delay,
    duration: 0.6,
    ease: 'power2.out'
  });
};

// ==========================================
// USE STAGGER HOOK
// ==========================================
export const useStagger = (selector: string, baseDelay: number = 0) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    const container = containerRef.current;
    const elements = container.querySelectorAll(selector);
    
    gsap.fromTo(elements,
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.1,
        duration: 0.6,
        ease: 'power2.out',
        delay: baseDelay,
        scrollTrigger: {
          trigger: container,
          start: 'top 85%',
          once: true
        }
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach(st => {
        if (st.vars.trigger === container) st.kill();
      });
    };
  }, [selector, baseDelay]);

  return containerRef;
};

// ==========================================
// WORD-BY-WORD REVEAL
// ==========================================
export const useWordReveal = () => {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !ref.current) return;

    const element = ref.current;
    const words = element.querySelectorAll('.word');
    
    gsap.fromTo(words,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.08,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.3,
        scrollTrigger: {
          trigger: element,
          start: 'top 80%',
          once: true
        }
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach(st => {
        if (st.vars.trigger === element) st.kill();
      });
    };
  }, []);

  return ref;
};

// ==========================================
// CLEANUP UTILITY
// ==========================================
export const cleanupAnimations = () => {
  if (typeof window === 'undefined') return;
  ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  gsap.killTweensOf('*');
};
