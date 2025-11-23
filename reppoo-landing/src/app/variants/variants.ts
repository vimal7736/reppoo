export const variants = {
  container: {
    base: "max-w-7xl mx-auto",
    fullWidth: "w-full",
    centered: "flex items-center justify-center",
  },

  section: {
    padding: "px-3 sm:px-4",
    paddingY: {
      sm: "py-6 sm:py-8 md:py-12 lg:py-16",
      md: "py-12 sm:py-16 md:py-20 lg:py-24",
      lg: "py-16 sm:py-20 md:py-24 lg:py-32",
    },
    minHeight: "min-h-screen",
  },

  background: {
    white: "bg-white",
    gray: "bg-gray-50",
    lightGray: "bg-gray-100",
    dark: "bg-gray-900",
  },

  border: {
    base: "border border-gray-200",
    light: "border border-gray-300",
    top: "border-t border-gray-200",
  },

  rounded: {
    sm: "rounded-lg sm:rounded-xl",
    md: "rounded-lg sm:rounded-xl md:rounded-2xl",
    lg: "rounded-2xl sm:rounded-3xl",
    full: "rounded-full",
    card: "rounded-2xl sm:rounded-3xl lg:rounded-[32px]",
  },

  text: {
    h1: "text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900",
    h2: "text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900",
    h3: "text-lg sm:text-xl md:text-2xl font-semibold text-gray-900",
    h4: "text-base sm:text-lg md:text-xl font-semibold text-gray-900",

    body: {
      xs: "text-xs sm:text-sm md:text-base text-gray-600",
      sm: "text-sm sm:text-base md:text-lg text-gray-600",
      md: "text-base sm:text-lg md:text-xl text-gray-600",
    },

    label: {
      xs: "text-[9px] sm:text-[10px] md:text-xs",
      sm: "text-[10px] sm:text-xs md:text-sm",
      md: "text-xs sm:text-sm md:text-base",
    },

    primary: "text-gray-900",
    secondary: "text-gray-600",
    muted: "text-gray-500",
    light: "text-gray-400",
    white: "text-white",

    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  },

  button: {
    base: "inline-flex items-center justify-center font-semibold transition-all",

    size: {
      xs: "px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs",
      sm: "px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm",
      md: "px-3 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 text-xs sm:text-sm md:text-base",
      lg: "px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg",
    },

    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-700 hover:text-gray-900",
    outline: "bg-white border border-gray-200 text-gray-900 hover:border-blue-600 hover:text-blue-600",

    disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
  },

  card: {
    base: "bg-white shadow-xl",
    bordered: "bg-white border border-gray-200",
    elevated: "bg-white shadow-lg shadow-gray-200",
    hover: "hover:shadow-2xl transition-shadow",

    padding: {
      sm: "p-2.5 sm:p-3 md:p-4",
      md: "p-3 sm:p-4 md:p-5 lg:p-6",
      lg: "p-6 sm:p-8 md:p-10 lg:p-14",
    },
  },


  flex: {
    row: "flex flex-row",
    col: "flex flex-col",
    center: "flex items-center justify-center",
    between: "flex items-center justify-between",
    start: "flex items-center justify-start",
    end: "flex items-center justify-end",
    wrap: "flex flex-wrap",
  },

  grid: {
    cols2: "grid lg:grid-cols-2",
    cols3: "grid md:grid-cols-3",
    responsive: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  },


  gap: {
    xs: "gap-1 sm:gap-1.5 md:gap-2",
    sm: "gap-1.5 sm:gap-2 md:gap-3",
    md: "gap-2 sm:gap-3 md:gap-4",
    lg: "gap-3 sm:gap-4 md:gap-6 lg:gap-12",
    xl: "gap-4 sm:gap-6 md:gap-8 lg:gap-12",
  },

  spacing: {
    xs: "space-y-1.5 sm:space-y-2 md:space-y-3",
    sm: "space-y-2 sm:space-y-3 md:space-y-4",
    md: "space-y-3 sm:space-y-4 md:space-y-6",
    lg: "space-y-4 sm:space-y-6 md:space-y-8",
  },

  margin: {
    bottom: {
      xs: "mb-1.5 sm:mb-2 md:mb-3",
      sm: "mb-2 sm:mb-3 md:mb-4",
      md: "mb-3 sm:mb-4 md:mb-6",
      lg: "mb-6 sm:mb-8 md:mb-12 lg:mb-16",
    },
  },

  
  icon: {
    xs: "w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4",
    sm: "w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5",
    md: "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6",
    lg: "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8",
    xl: "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12",
  },

  avatar: {
    xs: "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8",
    sm: "w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10",
    md: "w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14",
    lg: "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16",
    base: "rounded-full object-cover",
  },

  image: {
    logo: "h-3 sm:h-4 md:h-5 lg:h-6 object-contain",
    contain: "object-contain w-full h-auto",
    cover: "object-cover w-full h-full",
  },

 
  interactive: {
    hover: "hover:opacity-80 transition-opacity",
    hoverScale: "hover:scale-105 transition-transform",
    focus: "focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none",
    disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
  },


  transition: {
    base: "transition-all",
    colors: "transition-colors",
    transform: "transition-transform",
    shadow: "transition-shadow",
  },


  utility: {
    srOnly: "sr-only",
    truncate: "truncate",
    flexShrink: "flex-shrink-0",
    relative: "relative",
    absolute: "absolute",
    fixed: "fixed",
    inset0: "inset-0",
    zIndex: {
      10: "z-10",
      20: "z-20",
      30: "z-30",
      40: "z-40",
      50: "z-50",
    },
  },

  
  shadow: {
    sm: "shadow-md",
    md: "shadow-lg",
    lg: "shadow-xl",
    colored: "shadow-xl shadow-gray-200",
    blue: "shadow-blue-200",
  },

  
  loading: {
    spinner: "w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4",
    spinnerSm: "w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin",
  },

 
  input: {
    base: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all",
    label: "block text-sm font-medium text-gray-700 mb-2",
    error: "p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2",
  },

  
  modal: {
    backdrop: "fixed inset-0 bg-black/50 backdrop-blur-sm z-50",
    container: "fixed inset-0 flex items-center justify-center z-50 p-4",
    content: "bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative",
  },


  social: {
    button: "w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center transition-all",
    icon: "w-4 h-4 sm:w-5 sm:h-5",
  },
};

export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

