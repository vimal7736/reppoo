'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import { useInView } from 'framer-motion';
import { FAQ as FAQType } from '@/lib/types';
import { variants, cn } from '@/app/variants/variants';

interface FAQProps {
    data: FAQType[];
}

export default function FAQ({ data }: FAQProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <section
            ref={ref}
            className={cn(
                variants.section.paddingY.md,
                variants.section.padding,
                variants.background.white
            )}
        >
            <div className={variants.container.base}>
                <motion.div
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                    variants={fadeInUp}
                    transition={{ duration: 0.6 }}
                    className={cn("text-center", variants.margin.bottom.lg)}
                >
                    <h2 className={cn(
                        variants.text.h1,
                        "mb-3 sm:mb-4"
                    )}>
                        Frequently Asked Questions
                    </h2>
                    <p className={cn(
                        variants.text.body.sm,
                        "max-w-2xl mx-auto"
                    )}>
                        Find answers to common questions about our AI-powered wellness platform
                    </p>
                </motion.div>

                <motion.div
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                    variants={fadeInUp}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="max-w-3xl mx-auto"
                >
                    <div className={variants.spacing.sm}>
                        {data.map((faq, index) => (
                            <motion.div
                                key={faq.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                                transition={{ delay: 0.1 * index, duration: 0.5 }}
                                className={cn(
                                    variants.card.bordered,
                                    variants.rounded.sm,
                                    "overflow-hidden",
                                    "hover:border-blue-300",
                                    variants.transition.colors
                                )}
                            >
                                <button
                                    onClick={() => toggleFAQ(index)}
                                    className={cn(
                                        "w-full",
                                        variants.flex.between,
                                        "p-4 sm:p-5 md:p-6",
                                        "text-left",
                                        variants.transition.colors,
                                        openIndex === index ? "bg-gray-50" : "bg-white hover:bg-gray-50"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            variants.text.label.md,
                                            variants.text.semibold,
                                            openIndex === index ? "text-blue-600" : variants.text.primary,
                                            "transition-colors duration-300 pr-4"
                                        )}
                                    >
                                        {faq.question}
                                    </span>

                                    <motion.div
                                        animate={{ rotate: openIndex === index ? 180 : 0 }}
                                        transition={{ duration: 0.3 }}
                                        className={variants.utility.flexShrink}
                                    >
                                        <svg
                                            className={cn(
                                                variants.icon.sm,
                                                variants.text.secondary
                                            )}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                    </motion.div>
                                </button>

                                <AnimatePresence>
                                    {openIndex === index && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className={cn(
                                                "p-4 sm:p-5 md:p-6 pt-0",
                                                variants.text.body.xs,
                                                "leading-relaxed"
                                            )}>
                                                {faq.answer}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}