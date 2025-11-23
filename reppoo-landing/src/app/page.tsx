'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import LoginModal from '@/components/LoginModal';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Testimonials from '@/components/Testimonials';
import FAQ from '@/components/FAQ';
import { strapiAPI } from '@/lib/strapi';
import { LandingPageData } from '@/lib/types';
import Footer from '@/components/Foot';
import { variants, cn } from '@/app/variants/variants';
import { motion } from 'framer-motion';

export default function Home() {
  const { user, login, logout, isLoading: authLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [data, setData] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const pageData = await strapiAPI.getLandingPageData();
        setData(pageData);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load page data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (authLoading || loading) {
    return (
      <div className={cn(
        variants.section.minHeight,
        variants.flex.center,
        variants.background.white
      )}>
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
          />
          <p className={cn(variants.text.secondary, "text-lg")}>Loading your experience...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(
        variants.section.minHeight,
        variants.flex.center,
        variants.background.white,
        "px-4"
      )}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Oops! Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
          </div>
          
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Loading
            </motion.button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Go to Homepage
            </button>
          </div>
          
          <p className="mt-6 text-sm text-gray-500">
            If this problem persists, please contact support
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Header
        user={user}
        onLogin={() => setShowLoginModal(true)}
        onLogout={logout}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={login}
      />

      <main className={cn(variants.section.minHeight, variants.background.white)}>
        {data?.hero && <Hero data={data.hero} />}
        {data?.about && <About data={data.about} />}
        {data?.testimonials && data.testimonials.length > 0 && (
          <Testimonials data={data.testimonials} />
        )}
        {data?.faqs && data.faqs.length > 0 && <FAQ data={data.faqs} />}
      </main>

      <Footer />
    </>
  );
}