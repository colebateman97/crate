import { motion } from 'framer-motion'

export function AddFAB({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      className="fixed bottom-20 right-4 z-50 md:hidden w-14 h-14 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-2xl font-light shadow-2xl flex items-center justify-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.05 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      +
    </motion.button>
  )
}
