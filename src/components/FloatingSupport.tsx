import { motion } from "framer-motion";
import whatsappLogo from "@/assets/whatsapp-logo.jpg";

const FloatingSupport = () => {
  const handleClick = () => {
    window.open("https://chat.whatsapp.com/B6ag4e3ineULuAiAOkoyvb?mode=hqrc", "_blank");
  };

  return (
    <motion.button
      drag
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={{
        top: 0,
        left: 0,
        right: window.innerWidth - 70,
        bottom: window.innerHeight - 70,
      }}
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-elegant hover:shadow-glow-cyan transition-shadow cursor-pointer"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      style={{
        touchAction: "none",
      }}
    >
      <img 
        src={whatsappLogo} 
        alt="WhatsApp Suporte" 
        className="w-full h-full rounded-full object-cover"
        draggable={false}
      />
    </motion.button>
  );
};

export default FloatingSupport;
