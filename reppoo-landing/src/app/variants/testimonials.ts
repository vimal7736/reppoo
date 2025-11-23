import { cn, variants } from "@/app/variants/variants";

export const testimonialStyles = {
  section: cn(
    variants.section.paddingY.md,
    variants.background.gray,
    variants.flex.center,
    "px-4"
  ),

  headingWrapper: cn(
    "text-center",
    variants.margin.bottom.lg
  ),

  heading: cn(
    variants.text.h2,
    "leading-tight text-[#1a2036]"
  ),

  subHeading: cn(
    variants.text.body.sm,
    "max-w-2xl mx-auto font-light mt-2"
  ),

  cardContainer: "relative max-w-5xl mx-auto",

  arrowLeft: cn(
    variants.button.base,
    variants.button.size.md,
    "hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white shadow-md hover:bg-gray-100"
  ),

  arrowRight: cn(
    variants.button.base,
    variants.button.size.md,
    "hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 rounded-full shadow-md hover:bg-[#4176f5] hover:text-white"
  ),

  card: cn(
    variants.card.elevated,
    variants.rounded.card,
    variants.card.padding.lg,
    "relative flex flex-col justify-between"
  ),

  content: cn(
    variants.text.body.sm,
    "text-center mb-10 leading-snug"
  ),

  avatar: (isActive: boolean) =>
    cn(
      variants.avatar.md,
      variants.rounded.full,
      "overflow-hidden mb-2",
      isActive ? "bg-[#d8a88f]" : "bg-gray-300"
    ),

  selectorWrapper: cn(
    "absolute -bottom-20 left-1/2 -translate-x-1/2 w-full overflow-x-auto no-scrollbar"
  ),

  selector: (active: boolean) =>
    cn(
      "w-36 p-3 flex-shrink-0 flex items-center gap-2 transition-all rounded-xl shadow-md",
      active
        ? "bg-white ring-2 ring-[#4176f5] scale-105 shadow-blue-200"
        : "bg-white opacity-80 hover:opacity-100 shadow-gray-200"
    ),
};
