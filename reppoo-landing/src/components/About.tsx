'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { getStrapiMedia } from '@/lib/strapi';
import { About as AboutType } from '@/lib/types';
import { variants, cn } from '@/app/variants/variants';

interface LogoItem {
    id: number;
    url: string;
    alternativeText?: string;
}

interface AboutProps {
    data: AboutType & {
        logos?: LogoItem[];
    };
}

export default function About({ data }: AboutProps) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    const { heading, subheading, logos } = data;

    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <section
            ref={ref}
            className={cn(
                variants.background.white,
                variants.section.paddingY.sm,
                variants.section.padding,
                variants.background.gray
            )}
        >
            <div className={variants.container.base}>
                <motion.div
                    variants={fadeInUp}
                    className={cn(
                        variants.flex.center,
                        variants.gap.xl,
                        "opacity-30 py-1.5 sm:py-2 md:py-3",
                        variants.margin.bottom.lg,
                        variants.flex.wrap
                    )}
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                >
                    {logos?.length ? (
                        logos.map((logo) => {
                            const logoUrl = getStrapiMedia(logo.url);

                            return (
                                <div key={logo.id} className={cn("w-auto", variants.flex.center)}>
                                    <img
                                        src={logoUrl}
                                        alt={logo.alternativeText || 'Partner Logo'}
                                        className={variants.image.logo}
                                    />
                                </div>
                            );
                        })
                    ) : (
                        <p className={cn(variants.text.light, variants.text.label.sm, "italic")}>
                            No partner logos yet.
                        </p>
                    )}
                </motion.div>

                <motion.div
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                    variants={fadeInUp}
                >
                    <div className={cn(variants.grid.cols2, variants.gap.xl, "items-center")}>
                        <div>
                            <motion.h2
                                variants={fadeInUp}
                                className={cn(
                                    variants.text.h2,
                                    variants.margin.bottom.sm
                                )}
                            >
                                {heading || "Maximizing Your Health Potential Together"}
                            </motion.h2>

                            <motion.p
                                variants={fadeInUp}
                                className={cn(
                                    variants.text.label.sm,
                                    variants.text.semibold,
                                    variants.text.primary,
                                    "mb-1.5 sm:mb-2"
                                )}
                            >
                                Smart Nutrition Planning
                            </motion.p>

                            <motion.p
                                variants={fadeInUp}
                                className={cn(
                                    variants.text.body.xs,
                                    variants.margin.bottom.md
                                )}
                            >
                                {subheading || "Your AI-powered health companion transforms the way you approach wellness."}
                            </motion.p>

                            <motion.button
                                variants={fadeInUp}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={cn(
                                    "px-3 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3",
                                    variants.background.white,
                                    variants.border.light,
                                    variants.text.primary,
                                    "rounded-2xl sm:rounded-3xl",
                                    variants.text.label.md,
                                    variants.text.semibold,
                                    "hover:bg-gray-50",
                                    variants.transition.colors
                                )}
                            >
                                Read More
                            </motion.button>
                        </div>

                        <motion.div
                            variants={fadeInUp}
                            className={cn(
                                variants.background.lightGray,
                                variants.rounded.md,
                                "p-3 sm:p-4 md:p-5 lg:p-6",
                                variants.border.base
                            )}
                        >
                            <div className={cn(
                                variants.background.white,
                                "p-2.5 sm:p-3 md:p-4",
                                variants.rounded.sm
                            )}>
                                <div className={cn(
                                    variants.flex.between,
                                    variants.margin.bottom.md
                                )}>
                                    <div className={cn(variants.flex.center, variants.gap.xs)}>
                                        <svg className={cn(variants.icon.sm, variants.text.secondary)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className={cn(variants.text.label.sm, variants.text.medium, "text-gray-700")}>
                                            Time Tracker
                                        </span>
                                    </div>

                                    <button className={cn(
                                        variants.flex.center,
                                        variants.gap.xs,
                                        variants.text.label.sm,
                                        variants.text.secondary,
                                        "hover:text-gray-900"
                                    )}>
                                        <svg className={cn(variants.icon.xs)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        History
                                    </button>
                                </div>

                                <div className={cn(
                                    variants.flex.between,
                                    variants.margin.bottom.md,
                                    variants.background.lightGray,
                                    "p-2.5 sm:p-3 md:p-4",
                                    variants.rounded.sm
                                )}>
                                    <div className={cn(
                                        "text-2xl sm:text-3xl md:text-4xl lg:text-5xl",
                                        variants.text.bold,
                                        variants.text.primary,
                                        "tabular-nums"
                                    )}>
                                        10:34:<span className="text-blue-600">00</span>
                                    </div>
                                    <button className={cn(
                                        variants.avatar.md,
                                        "bg-blue-600",
                                        variants.rounded.full,
                                        variants.flex.center,
                                        "hover:bg-blue-700",
                                        variants.transition.colors,
                                        variants.utility.flexShrink
                                    )}>
                                        <svg className={cn(variants.icon.md, variants.text.white, "ml-0.5 sm:ml-1")} fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </button>
                                </div>

                                <div>
                                    <p className={cn(
                                        variants.text.label.xs,
                                        variants.text.muted,
                                        "mb-1.5 sm:mb-2 md:mb-3"
                                    )}>
                                        Previous Tasks
                                    </p>
                                    <div className={variants.spacing.xs}>
                                        {[1, 2].map((task) => (
                                            <div key={task} className={cn(
                                                variants.flex.between,
                                                "py-1 sm:py-1.5 md:py-2"
                                            )}>
                                                <div className={cn(variants.flex.center, "gap-1.5 sm:gap-2 md:gap-3")}>
                                                    <div className={cn(
                                                        variants.avatar.xs,
                                                        "bg-purple-100",
                                                        variants.rounded.sm.split(' ')[0],
                                                        variants.flex.center,
                                                        variants.utility.flexShrink
                                                    )}>
                                                        <svg className={cn(variants.icon.xs, "text-purple-600")} fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M10 2a8 8 0 100 16 8 8 0 000-16z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className={cn(
                                                            variants.text.label.sm,
                                                            variants.text.medium,
                                                            variants.text.primary
                                                        )}>
                                                            Task example
                                                        </p>
                                                        <p className={cn(variants.text.label.xs, variants.text.muted)}>
                                                            1:20:35
                                                        </p>
                                                    </div>
                                                </div>
                                                <button className={cn(variants.text.light, "hover:text-gray-600")}>
                                                    <svg className={cn(variants.icon.sm)} fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}