export type TemplateId = 'scroll-snap' | 'time-travel' | 'zoom-center' | 'cosmic-clock' | 'retro-pixel' | 'physics-wire';

export interface CourseSection {
  id: string;
  title: string;
  content: string;
  image?: string;
  order: number;
}

export interface CourseData {
  id: string;
  title: string;
  description: string;
  author: string;
  template: TemplateId;
  sections: CourseSection[];
  createdAt: string;
}

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
  icon: string;
  preview: string;
}
