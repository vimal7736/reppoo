'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Hero as HeroType } from '@/lib/types';
import { getStrapiMedia } from '@/lib/strapi';
import { variants, cn } from '@/app/variants/variants';

interface HeroProps {
    data: HeroType;
}

export default function Hero({ data }: HeroProps) {
    const { title, mainImage, statsNumbe, statsLabel } = data;

    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0 },
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
            },
        },
    };

    return (
        <section className={cn(
            "hero-bg",
            variants.utility.relative,
            variants.flex.center,
            "px-4 py-16 sm:py-20 overflow-hidden"
        )}>
            <div className={cn(variants.container.base, variants.container.fullWidth)}>
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="text-center"
                >
                    <motion.div
                        variants={fadeInUp}
                        className={cn(variants.utility.relative, "w-full max-w-4xl mx-auto")}
                    >
                        {mainImage?.url && (
                            <div className={variants.utility.relative}>
                                <Image
                                    src={getStrapiMedia(mainImage.url)}
                                    alt={mainImage.alternativeText || 'Hero Image'}
                                    width={1200}
                                    height={800}
                                    className={variants.image.contain}
                                    priority
                                />
                            </div>
                        )}
                    </motion.div>

                    <motion.div 
                        variants={fadeInUp} 
                        className={cn("mb-1 sm:mb-2", variants.flex.center)}
                    >
                        <div className={cn(
                            "inline-flex",
                            variants.flex.center,
                            "gap-2 sm:gap-3 px-3 sm:px-5"
                        )}>
                            <div className="flex -space-x-1.5 sm:-space-x-2">
                                {[1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10",
                                            variants.rounded.full,
                                            "bg-gradient-to-br from-blue-400 to-purple-400 border-2 border-white"
                                        )}
                                    />
                                ))}
                            </div>
                            <div className="flex items-baseline gap-0.5 sm:gap-1">
                                <span className={cn(
                                    "text-xl sm:text-2xl",
                                    variants.text.bold,
                                    variants.text.primary
                                )}>
                                    {statsNumbe}
                                </span>
                                <span className={cn(
                                    variants.text.label.sm,
                                    variants.text.secondary
                                )}>
                                    {statsLabel}
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.h1
                        variants={fadeInUp}
                        className={cn(
                            "text-2xl sm:text-3xl md:text-4xl lg:text-5xl",
                            variants.text.bold,
                            variants.text.primary,
                            "leading-tight mb-4 sm:mb-5 md:mb-6 px-2"
                        )}
                    >
                        {title}
                    </motion.h1>

                    <motion.p
                        variants={fadeInUp}
                        className={cn(
                            variants.text.body.sm,
                            "max-w-3xl mx-auto mb-8 sm:mb-10 md:mb-12 px-4"
                        )}
                    >
                        Transform your wellness journey with personalized AI-powered guidance that adapts to your unique needs.
                    </motion.p>

                    <motion.div 
                        variants={fadeInUp} 
                        className={cn(
                            variants.flex.row,
                            "gap-2 sm:gap-3",
                            "justify-center mb-10 sm:mb-12 md:mb-16 mx-auto px-4"
                        )}
                    >
                        <button className={cn(
                            variants.flex.center,
                            "gap-1.5 sm:gap-2",
                            "px-3 sm:px-4 md:px-5 py-2 sm:py-2.5",
                            variants.background.white,
                            variants.text.primary,
                            variants.rounded.sm.split(' ')[0],
                            variants.text.label.sm,
                            variants.text.semibold,
                            "shadow-lg hover:shadow-xl",
                            variants.transition.shadow,
                            variants.border.base
                        )}>
                            <svg className={cn(variants.icon.sm)} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                            <span>Download</span>
                        </button>

                        <button className={cn(
                            variants.flex.center,
                            "gap-1.5 sm:gap-2",
                            "px-3 sm:px-4 md:px-5 py-2 sm:py-2.5",
                            variants.background.white,
                            variants.text.primary,
                            variants.rounded.sm.split(' ')[0],
                            variants.text.label.sm,
                            variants.text.semibold,
                            "shadow-lg hover:shadow-xl",
                            variants.transition.shadow,
                            variants.border.base
                        )}>
                            <svg
                                className={cn(variants.icon.sm)}
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <defs>
                                    <linearGradient id="playStoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#06B6D4" />
                                        <stop offset="50%" stopColor="#6366F1" />
                                        <stop offset="100%" stopColor="#F43F5E" />
                                    </linearGradient>
                                </defs>
                                <path
                                    fill="url(#playStoreGradient)"
                                    d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"
                                />
                            </svg>
                            <span>Download</span>
                        </button>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}