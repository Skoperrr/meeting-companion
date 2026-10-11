import type { Transition, Variants } from "framer-motion";
export const fluidEase = [0.16, 1, 0.3, 1] as const;
export const springPhysics = {
  type: "spring",
  stiffness: 220,
  damping: 26,
  mass: 0.8,
} satisfies Transition;
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: fluidEase } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.35, ease: fluidEase } },
};
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
};
