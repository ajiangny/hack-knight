// Shared animated container for dropdown panels (SelectDropdown and
// SchoolCombobox) so every dropdown on the site opens and closes with the
// same motion. Callers wrap it in <AnimatePresence> so the exit animation
// plays on close.

import { motion } from "motion/react";
import type { ReactNode } from "react";

export default function DropdownPanel({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="register-combobox-list"
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      style={{ transformOrigin: "top" }}
    >
      {children}
    </motion.div>
  );
}
