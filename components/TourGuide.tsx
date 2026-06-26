'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const TOUR_STEPS = [
  // ── DASHBOARD ──────────────────────────────────────────────────
  {
    target: '#tour-dash-kpi-footprint',
    title: 'Total Footprint',
    content: 'This card shows your total carbon emissions (tCO₂e) across all operations. It also shows a month-over-month trend to quickly gauge if you are improving.',
    route: '/dashboard',
  },
  {
    target: '#tour-dash-kpi-budget',
    title: 'Carbon Budget',
    content: 'Track your emissions against your annual Net Zero carbon budget. Keep it in the green to stay on track for your sustainability goals!',
    route: '/dashboard',
  },
  {
    target: '#tour-dash-kpi-spend',
    title: 'Utility Spend & ROI',
    content: 'A summary of your total utility spend in GBP, along with AI-estimated cost savings from potential green initiatives.',
    route: '/dashboard',
  },
  {
    target: '#tour-dash-kpi-clean',
    title: 'Clean Power Mix',
    content: 'Your percentage of renewable energy usage. Switching to a certified green supplier will significantly boost this number and reduce your Scope 2 emissions.',
    route: '/dashboard',
  },
  {
    target: '#tour-dash-chart-emissions',
    title: 'Emissions Trend',
    content: 'An interactive chart plotting your carbon footprint and energy usage over the last 6 months. Watch your emissions drop as you implement reduction strategies.',
    route: '/dashboard',
  },
  {
    target: '#tour-dash-chart-monthly',
    title: 'Budget Ring',
    content: 'This visualizer compares your current month\'s emissions against your historical monthly average to see if you are consuming more or less than usual.',
    route: '/dashboard',
  },
  {
    target: '#tour-dash-secr',
    title: 'SECR Audit Readiness',
    content: 'Crucial for UK businesses! This tracks how many months of data you\'ve uploaded. Once it hits 100%, you can instantly export a fully compliant SECR report.',
    route: '/dashboard',
  },
  {
    target: '#tour-dash-emissions-type',
    title: 'Emissions by Type',
    content: 'A breakdown of what is generating your carbon footprint (e.g., Electricity vs Gas). This helps you identify exactly where to focus your reduction efforts.',
    route: '/dashboard',
  },

  // ── HISTORY (4 steps) ─────────────────────────────────────────────────────
  {
    target: '#tour-history-stats',
    title: 'Your Historical Overview',
    content: 'These KPIs give you a quick summary of all the utility bills you have successfully processed and verified through the system.',
    route: '/history',
  },
  {
    target: '#tour-history-export',
    title: 'Data Portability',
    content: 'Need to share your data with auditors? Click here to instantly export your entire historical ledger as a CSV file.',
    route: '/history',
  },
  {
    target: '#tour-history-search',
    title: 'Instant Search',
    content: 'Looking for a specific bill? You can instantly filter your historical records by supplier name or audit date here.',
    route: '/history',
  },
  {
    target: '#tour-history-filters',
    title: 'Filter by Resource',
    content: 'Use these quick toggles to filter your records and only see your Electricity, Gas, or Water bills.',
    route: '/history',
  },

  // ── UPLOAD (4 steps) ──────────────────────────────────────────────────────
  {
    target: '#tour-upload-type',
    title: '1. Select the Utility Type',
    content: 'First, select what type of bill you are uploading (Electricity, Gas, Water, etc.). This tells our AI which UK DEFRA emission factors to apply to your data.',
    route: '/upload',
  },
  {
    target: '#tour-upload-dropzone',
    title: '2. Drop your PDF',
    content: 'Simply drag and drop your utility bill PDF here, or click to browse. Our AI will instantly read the document, extract the supplier, billing period, and exact energy usage.',
    route: '/upload',
  },
  {
    target: '#tour-upload-security',
    title: 'Enterprise-Grade Security',
    content: 'Don\'t worry—your documents are processed with end-to-end encryption. Once the data is extracted, the PDF is securely handled according to strict compliance standards.',
    route: '/upload',
  },
  {
    target: '#tour-back-to-dashboard',
    title: 'Return to Dashboard',
    content: 'Once your bill is processed and the carbon impact is calculated, you can return to your dashboard to see how it affects your overall metrics.',
    route: '/upload',
  },

  // ── REPORTS (5 steps) ─────────────────────────────────────────────────────
  {
    target: '#tour-reports-export',
    title: 'Date filters and PDF Export',
    content: 'Filter your data by custom date ranges and instantly download a fully compliant SECR PDF report for your stakeholders.',
    route: '/reports',
  },
  {
    target: '#tour-reports-summary',
    title: 'Executive Summary',
    content: 'Quickly gauge your total footprint, utility spend, year-over-year changes, and budget status at a glance.',
    route: '/reports',
  },
  {
    target: '#tour-reports-budget',
    title: 'Carbon Budget Tracker',
    content: 'Visually track your carbon usage against your set annual cap and ensure you are on track to meet your targets.',
    route: '/reports',
  },
  {
    target: '#tour-reports-charts',
    title: 'Trends & Scope Breakdown',
    content: 'Analyze your monthly emission trends and see exactly how much of your footprint comes from Scope 1 vs Scope 2 vs Scope 3 sources.',
    route: '/reports',
  },
  {
    target: '#tour-reports-table',
    title: 'Detailed Resource Breakdown',
    content: 'A granular table breaking down your footprint by specific utility types (like electricity or gas), their exact costs, and weight percentages.',
    route: '/reports',
  },

  // ── TARGETS (5 steps) ─────────────────────────────────────────────────────
  {
    target: '#tour-targets-advisor',
    title: 'AI Strategy Advisor',
    content: 'Based on your history, our AI suggests tailored strategies like upgrading to LED lighting or switching to renewable tariffs. Add them to your plan to hit your goals.',
    route: '/targets',
  },
  {
    target: '#tour-targets-modeler',
    title: 'Scenario Modeler',
    content: 'This panel lets you configure your carbon reduction targets.',
    route: '/targets',
  },
  {
    target: '#tour-targets-pathway',
    title: 'Science-Based Targets',
    content: 'Select an SBTi pathway (e.g. 1.5°C). The system will automatically enforce the minimum required annual reduction rate for your choice to ensure you remain Paris Agreement aligned.',
    route: '/targets',
  },
  {
    target: '#tour-targets-sliders',
    title: 'Fine-tune Reductions',
    content: 'Manually fine-tune your carbon cap and reduction rates using these sliders.',
    route: '/targets',
  },
  {
    target: '#tour-targets-roadmap',
    title: 'Your Action Plan',
    content: 'This is your roadmap. As you add strategies from the AI advisor, they appear here. Check them off as you execute them to track your completion metrics!',
    route: '/targets',
  },

  // ── COMPARE (5 steps) ──────────────────────────────────────────────────────
  {
    target: '#tour-compare-periods',
    title: 'Observation Periods',
    content: 'Select two distinct time ranges to compare. You can compare year-over-year, quarter-over-quarter, or any custom periods.',
    route: '/compare',
  },
  {
    target: '#tour-compare-summary',
    title: 'Comparative Summary',
    content: 'These metrics show the absolute variance between your selected periods for Carbon, Energy, and Financial cost.',
    route: '/compare',
  },
  {
    target: '#tour-compare-auditor',
    title: 'AI EcoPilot Auditor',
    content: 'Our AI analyzes the variance and provides a human-readable executive summary of your efficiency shifts.',
    route: '/compare',
  },
  {
    target: '#tour-compare-chart',
    title: 'Resource Matrix',
    content: 'Visually compare emissions side-by-side across electricity, gas, and fleet operations.',
    route: '/compare',
  },
  {
    target: '#tour-compare-table',
    title: 'Granular Breakdown',
    content: 'Exportable data table showing exact metric variances for compliance reporting.',
    route: '/compare',
  },

  // ── TEAM (3 steps) ─────────────────────────────────────────────────────────
  {
    target: '#tour-team-provision',
    title: 'Provision Access',
    content: 'Invite colleagues or external auditors to your organisation. You can manage their permissions once they join.',
    route: '/team',
  },
  {
    target: '#tour-team-discovery',
    title: 'Discovery Settings',
    content: 'Enable domain discovery to let anyone with your company email automatically request access to the system.',
    route: '/team',
  },
  {
    target: '#tour-team-table',
    title: 'Team Roster',
    content: 'Manage existing members, upgrade roles to Admin, or revoke access. You can also approve pending join requests here.',
    route: '/team',
  },

  // ── PROFILE (2 steps) ──────────────────────────────────────────────────────
  {
    target: '#tour-profile-identity',
    title: 'Your Identity',
    content: 'Review your personal details and your organisation\'s subscription tier at a glance.',
    route: '/profile',
  },
  {
    target: '#tour-profile-tabs',
    title: 'Configuration Tabs',
    content: 'Navigate through these tabs to update your personal details, secure your account, or manage organisation-wide settings.',
    route: '/profile',
  },

  // ── BILLING (1 step) ───────────────────────────────────────────────────────
  {
    target: '#tour-billing-plans',
    title: 'System Plans',
    content: 'Review your current capacity limits or upgrade your cluster to unlock more seats and premium features.',
    route: '/billing',
  }
];

export default function TourGuide() {
  const [stepIndex, setStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  
  const pathname = usePathname();
  const router = useRouter();

  // Load state and determine if we should be active
  useEffect(() => {
    let isMounted = true;
    
    // Only check backend state once when the component first mounts or path becomes /dashboard
    // and the tour is not already active.
    const checkTourState = async () => {
      if (isActive) return;
      
      try {
        const res = await fetch('/api/profile/tour');
        if (res.ok && isMounted) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            // Auto-start on upload only if they haven't seen it
            if (!data.has_seen_tour && pathname === '/upload') {
              setIsActive(true);
              const startIdx = TOUR_STEPS.findIndex(s => s.route === '/upload');
              setStepIndex(startIdx !== -1 ? startIdx : 0);
              
              // Mark as seen on the backend so it doesn't auto-start again across sessions
              fetch('/api/profile/tour', { method: 'POST' }).catch(console.error);
            }
          }
        }
      } catch (err) {
        console.error("Failed to check tour state", err);
      }
    };
    
    checkTourState();

    const startTour = (e: Event) => {
      let startIndex = 0;
      if (e instanceof CustomEvent && typeof e.detail === 'string') {
        const detailStr = e.detail;
        
        if (detailStr.startsWith('/')) {
          // It's a route request from the Sidebar menu
          const routeIdx = TOUR_STEPS.findIndex(step => step.route === detailStr);
          if (routeIdx !== -1) startIndex = routeIdx;
        } else {
          // It's a specific target element request
          const targetIdx = TOUR_STEPS.findIndex(step => step.target === detailStr);
          if (targetIdx !== -1) startIndex = targetIdx;
        }
      } else {
        // If no specific target is provided, find the first step for the current page!
        const currentPageIdx = TOUR_STEPS.findIndex(s => pathname === s.route || (s.route !== '/' && pathname.includes(s.route)));
        if (currentPageIdx !== -1) {
          startIndex = currentPageIdx;
        }
      }
      setIsActive(true);
      setStepIndex(startIndex);
      const nextStep = TOUR_STEPS[startIndex];
      if (nextStep && nextStep.route && !pathname.includes(nextStep.route) && nextStep.route !== '/') {
        router.push(nextStep.route);
      }
    };
    window.addEventListener('start-tour', startTour);
    return () => {
      isMounted = false;
      window.removeEventListener('start-tour', startTour);
    };
  }, [pathname, router]);

  // Find target element and measure it
  useEffect(() => {
    if (!isActive) return;

    const step = TOUR_STEPS[stepIndex];
    if (!step) {
      // Tour finished
      setIsActive(false);
      return;
    }

    // Scroll the target element into view smoothly when step changes
    const targetEl = document.querySelector(step.target);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const updateRect = () => {
      const el = document.querySelector(step.target);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null); // Target not on this page, hide tour quietly
      }
    };

    updateRect();

    // Re-measure on scroll or resize
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    
    // Polling fallback in case element loads dynamically
    const interval = setInterval(updateRect, 500);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      clearInterval(interval);
    };
  }, [isActive, stepIndex, pathname]);

  const handleNext = () => {
    const nextStepIndex = stepIndex + 1;
    
    if (nextStepIndex >= TOUR_STEPS.length) {
      setIsActive(false);
      return;
    }

    const currentStep = TOUR_STEPS[stepIndex];
    const nextStep = TOUR_STEPS[nextStepIndex];

    // If the next step is on a different page, gracefully end this contextual tour
    if (currentStep && nextStep && currentStep.route !== nextStep.route) {
      setIsActive(false);
      return;
    }

    setStepIndex(nextStepIndex);
  };

  const handleSkip = () => {
    setIsActive(false);
    window.dispatchEvent(new Event('tour-skipped'));
  };


  // If not active, or target not found on this screen, render nothing!
  if (!isActive || !targetRect) return null;

  const step = TOUR_STEPS[stepIndex];
  const padding = 8; // padding around the target

  // Calculate if tooltip needs to go above the target to avoid overflowing the bottom
  const tooltipHeight = 200; // approximate height of tooltip
  const spaceBelow = window.innerHeight - targetRect.bottom;
  const isOffBottom = spaceBelow < tooltipHeight + padding + 16;
  
  const tooltipTop = isOffBottom 
    ? Math.max(16, targetRect.top - padding - tooltipHeight) // put above
    : targetRect.bottom + padding + 16; // put below

  const tooltipWidth = Math.min(300, window.innerWidth - 32);
  const maxLeft = window.innerWidth - tooltipWidth - 16;
  const idealLeft = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
  const finalLeft = Math.max(16, Math.min(maxLeft, idealLeft));

  const nextStepInfo = TOUR_STEPS[stepIndex + 1];
  const isLastStep = !nextStepInfo || nextStepInfo.route !== step.route;

  // Calculate relative step numbers for the current page
  const stepsForCurrentRoute = TOUR_STEPS.filter(s => s.route === step.route);
  const relativeStepIndex = stepsForCurrentRoute.findIndex(s => s.target === step.target);
  const totalStepsInRoute = stepsForCurrentRoute.length;

  return (
    <div style={{ zIndex: 99999, position: 'fixed', inset: 0, pointerEvents: 'none' }}>
      
      {/* 1. The dark overlay using a massive box-shadow around a cutout hole */}
      <div 
        style={{
          position: 'absolute',
          top: targetRect.top - padding,
          left: targetRect.left - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
          borderRadius: '12px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
          transition: 'all 0.3s ease',
          pointerEvents: 'auto', // allow clicks INSIDE the hole
        }}
      />

      {/* 2. The tooltip box */}
      <div
        style={{
          position: 'absolute',
          top: tooltipTop,
          left: finalLeft,
          width: tooltipWidth + 'px',
          backgroundColor: '#1E293B',
          borderRadius: '16px',
          padding: '20px',
          color: 'white',
          pointerEvents: 'auto', // allow clicking the tooltip
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          transition: 'all 0.3s ease',
        }}
      >
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold', color: '#10B981' }}>
          {step.title}
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: '1.5', color: '#CBD5E1' }}>
          {step.content}
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Step {relativeStepIndex + 1} of {totalStepsInRoute}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isLastStep && (
              <button
                onClick={handleSkip}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Skip
              </button>
            )}
            <button
              onClick={handleNext}
              style={{
                background: isLastStep ? '#10B981' : '#334155',
                border: isLastStep ? 'none' : '1px solid #475569',
                color: 'white',
                padding: '6px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {isLastStep ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
