
export interface StrapiImage {
  id: number;
  documentId: string;
  name: string;
  alternativeText?: string;
  width: number;
  height: number;
  url: string;
  formats?: {
    thumbnail?: { url: string };
    small?: { url: string };
    medium?: { url: string };
    large?: { url: string };
  };
}

export interface DownloadButton {
  id: number;
  platform: string;
  icon: string;
}

export interface Hero {
  id: number;
  documentId: string;
  title: string;
  subtitle: string;
  description: string;
  statsNumbe: string; 
  statsLabel: string;
  mainImage: StrapiImage;
  downloadButtons?: DownloadButton[];
}

export interface Feature {
  id: number;
  documentId: string;
  title: string;
  description: string;
  icon: string;
  order: number;
}

export interface About {
  id: number;
  documentId: string;
  heading: string;
  subheading: string;
  description: string;
  features: Feature[];
}

export interface Testimonial {
  id: number;
  documentId: string;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatar?: StrapiImage;
  order: number;
}

export interface FAQ {
  id: number;
  documentId: string;
  question: string;
  answer: string;
  order: number;
}

export interface LandingPageData {
  hero: Hero | null;
  about: About | null;
  testimonials: Testimonial[];
  faqs: FAQ[];
}