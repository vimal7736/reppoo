'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Image from 'next/image';
import { variants, cn } from '@/app/variants/variants';

interface User {
  name: string;
  email: string;
  avatar?: string;
}

interface HeaderProps {
  user?: User | null;
  onLogin: () => void;
  onLogout: () => void;
}

export default function Header({ user, onLogin, onLogout }: HeaderProps) {

  return (
    <header className={cn(
      variants.utility.fixed,
      "top-0 left-0 right-0",
      variants.utility.zIndex[50],
      "bg-white/20 backdrop-blur-md",
      variants.border.base
    )}>
      <div className={cn(
        variants.container.base,
        "px-4 sm:px-6 lg:px-4 py-2 sm:py-2.5 md:py-3",
        variants.flex.between
      )}>

        <div className={cn(variants.flex.center, "gap-2")}>
          <Image
            src="/reppo.png"
            alt="Reppoo Logo"
            width={25}
            height={25}
          />
          <span className="text-base sm:text-lg font-semibold text-gray-900 hidden sm:block">
            Reppoo
          </span>
        </div>


        <div>
          {!user ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogin}
              className={cn(
                "px-3 sm:px-4 md:px-6 py-1.5 sm:py-2",
                "text-sm sm:text-base text-gray-700 hover:text-gray-900",
                variants.text.medium,
                variants.transition.colors
              )}
            >
              <span className="hidden sm:inline">Admin login</span>
              <span className="inline sm:hidden">Login</span>
            </motion.button>
          ) : (
            <div className={cn(variants.flex.center, "gap-1.5 sm:gap-2 md:gap-3")}>
              <div className={cn(
                variants.flex.center,
                "gap-1.5 sm:gap-2 md:gap-3",
                "px-2 sm:px-3 md:px-4 py-1.5 sm:py-2"
              )}>
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={40}
                    height={40}
                    className={cn(
                      variants.rounded.full,
                      "w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10"
                    )}
                  />
                ) : (
                  <div className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10",
                    variants.rounded.full,
                    "bg-blue-600",
                    variants.flex.center,
                    variants.utility.flexShrink
                  )}>
                    <span className={cn(
                      variants.text.white,
                      variants.text.semibold,
                      "text-xs sm:text-sm"
                    )}>
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="text-left hidden sm:block">
                  <p className={cn(
                    variants.text.label.sm,
                    variants.text.semibold,
                    variants.text.primary,
                    variants.utility.truncate,
                    "max-w-[80px] sm:max-w-[120px] md:max-w-none"
                  )}>
                    {user.name}
                  </p>
                  <p className={cn(
                    variants.text.label.xs,
                    variants.text.muted,
                    variants.utility.truncate,
                    "max-w-[80px] sm:max-w-[120px] md:max-w-none"
                  )}>
                    {user.email}
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLogout}
                className={cn(
                  "px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2",
                  variants.text.label.sm,
                  "text-gray-700 hover:text-gray-900",
                  variants.border.light,
                  "rounded-3xl hover:bg-gray-50",
                  variants.transition.colors
                )}
              >
                Logout
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}