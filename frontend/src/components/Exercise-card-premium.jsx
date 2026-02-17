import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

export default function ExerciseCardPremium({
  title,
  description,
  icon: Icon,
  onClick,
  delay,
}) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.15, duration: 0.6 }}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.97 }}
      className="
        group relative w-full text-left overflow-hidden
        rounded-2xl p-8
        bg-gradient-to-br from-[#F3F1FF] via-[#EAE6FF] to-[#E0DAFF]
        border border-[#B6ABFF]
        hover:border-[#8F7EFF]
        hover:shadow-[0_24px_48px_rgba(124,108,255,0.2)]
        transition-all duration-300
      "
    >
      {/* Soft glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-[#9F92FF] to-[#D8CFFF] opacity-20 blur-2xl" />
      </div>

      {/* Icon */}
      <div className="relative z-10 mb-5 inline-block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6F63FF] to-[#B48BFF] rounded-xl blur-lg opacity-0 group-hover:opacity-80 transition-opacity duration-500" />
        <div className="relative bg-gradient-to-br from-[#6F63FF] to-[#B48BFF] rounded-xl p-3">
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Text */}
      <div className="relative z-10">
        <h3 className="text-xl font-bold mb-2 text-[#17153B]">
          {title}
        </h3>
        <p className="text-sm text-[#4B4A6A]">
          {description}
        </p>
      </div>

      {/* CTA */}
      <div className="
        relative z-10 mt-6 inline-flex items-center
        text-[#4B3BCB] font-semibold
        group-hover:translate-x-2
        transition-transform
      ">
        <span>Get Started</span>
        <ArrowRight className="w-4 h-4 ml-2" />
      </div>
    </motion.button>
  )
}
