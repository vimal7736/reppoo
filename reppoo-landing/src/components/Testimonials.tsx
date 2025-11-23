'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { useInView } from 'framer-motion';
import Image from 'next/image';
import { Testimonial } from '@/lib/types';
import { getStrapiMedia } from '@/lib/strapi';

interface TestimonialsProps {
  data: Testimonial[];
}

export default function Testimonials({ data }: TestimonialsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const ref = useRef(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const nextTestimonial = () => {
    const next = (currentIndex + 1) % data.length;
    handleSelect(next);
  };

  const prevTestimonial = () => {
    const prev = (currentIndex - 1 + data.length) % data.length;
    handleSelect(prev);
  };

  const handleSelect = (index: number) => {
    setCurrentIndex(index);

    if (scrollRef.current) {
      const button = scrollRef.current.children[index] as HTMLElement;
      button?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const currentTestimonial = data[currentIndex];

  const getAvatarBg = (index: number) => {
    if (index === 0) return 'bg-[#d8a88f]';
    return 'bg-gray-300';
  };

  /** 🔥 Infinite Auto-Scroll Logic */
  useEffect(() => {
    if (!scrollRef.current) return;

    const scrollContainer = scrollRef.current;

    const scrollInterval = setInterval(() => {
      scrollContainer.scrollLeft += 1;

      // Loop back when end reached
      if (scrollContainer.scrollLeft + scrollContainer.clientWidth >= scrollContainer.scrollWidth - 1) {
        scrollContainer.scrollLeft = 0;
      }
    }, 20); // smaller = faster scroll

    return () => clearInterval(scrollInterval);
  }, []);

  return (
    <section
      ref={ref}
      className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 bg-[#f9f9fb] flex items-center justify-center"
    >
      <div className="">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16"
        >
          <div className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-semibold text-[#1a2036] leading-tight">
            Our Users Feel the <br /> Transformation
          </div>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto font-light mt-2">
            Real Stories from People Empowered by Personalized Wellness
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          <button
            onClick={prevTestimonial}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-md items-center justify-center hover:bg-gray-100 transition-colors z-20"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={nextTestimonial}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full hover:bg-[#4176f5] hover:text-white shadow-md items-center justify-center transition-colors z-20"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="mx-0 sm:mx-8 md:mx-12 lg:mx-16 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-2xl sm:rounded-3xl lg:rounded-[32px] p-6 sm:p-8 md:p-10 lg:p-14 shadow-xl shadow-gray-200 relative flex flex-col justify-between"
              >
                <div className="relative z-10 text-center px-6 sm:px-8 md:px-0">
                  <p className="text-xs sm:text-sm md:text-base lg:text-md text-[#1a2036] mb-6 font-normal leading-snug mx-auto">
                    "{currentTestimonial.content}"
                  </p>

                  <div className="flex flex-col items-center justify-center pt-6 border-gray-100">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full overflow-hidden ${getAvatarBg(currentIndex)} mb-2`}
                    >
                      {currentTestimonial.avatar ? (
                        <Image
                          src={getStrapiMedia(currentTestimonial.avatar.url)}
                          alt={currentTestimonial.name}
                          width={56}
                          height={56}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-semibold text-lg">
                          {currentTestimonial.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <h4 className="font-semibold text-gray-900 text-sm">
                      {currentTestimonial.name}, <span>{currentTestimonial.role}</span>
                    </h4>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Empowered by AI Wellness Journeys</p>
                  </div>
                </div>

                <div
                  ref={scrollRef}
                  className="absolute -bottom-16 sm:-bottom-20 md:-bottom-24 left-1/2 -translate-x-1/2 w-full max-w-full overflow-x-auto no-scrollbar whitespace-nowrap"
                >
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 px-4 py-2">
                    {[...data, ...data].map((testimonial, index) => (
                      <button
                        key={testimonial.id + '__' + index}
                        onClick={() => handleSelect(index % data.length)}
                        className={`w-32 sm:w-36 md:w-40 p-2 flex-shrink-0 flex items-center gap-2 rounded-xl transition-all bg-white shadow-md ${
                          index % data.length === currentIndex
                            ? 'ring-2 ring-[#4176f5] scale-105'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full overflow-hidden ${getAvatarBg(index)}`}>
                          <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm">
                            {testimonial.name.charAt(0)}
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-semibold text-gray-900 truncate">
                            {testimonial.name}
                          </p>
                          <p className="text-[9px] text-gray-500 truncate">{testimonial.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
