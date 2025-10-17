🎯 Objective

Enhance the Tasty Banana hero section with modern motion and interactive scroll effects.
Focus:

Animated border running around “With AI Power”

Smooth fade-in transitions for each text line

Subtle parallax/scroll background movement

🧩 Libraries Required
npm install framer-motion react-scroll-parallax

💡 Implementation Steps
1️⃣ Import and Setup

In your HeroSection.jsx (or equivalent):

import { motion } from "framer-motion";
import { ParallaxBanner } from "react-scroll-parallax";


Wrap your entire hero section background inside a <ParallaxBanner> to add a subtle scroll depth.

2️⃣ Animated Background (Parallax)
<ParallaxBanner
  layers={[
    { image: "/assets/bg-grid-dark.png", speed: -20 },
    { children: <YourHeroContentHere />, speed: -10 },
  ]}
  className="h-screen flex items-center justify-center"
/>


➡ This gives a smooth, dynamic depth when scrolling.

3️⃣ Text Fade-In Animation

Use Framer Motion variants to control the timing for each line:

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};


Then apply:

<motion.h1
  variants={fadeIn}
  initial="hidden"
  animate="show"
  className="text-6xl font-bold text-white text-center"
>
  Create Stunning Images
</motion.h1>

<motion.h2
  variants={fadeIn}
  initial="hidden"
  animate="show"
  transition={{ delay: 0.3 }}
  className="text-6xl font-bold text-yellow-400 mt-2 text-center relative"
>
  With AI Power
</motion.h2>

4️⃣ Animated Border Around “With AI Power”

Use a pseudo-element or a <motion.div> absolutely positioned around the text:

<div className="relative inline-block">
  <motion.div
    className="absolute inset-0 rounded-md border-2 border-yellow-400"
    animate={{
      scale: [1, 1.05, 1],
      boxShadow: [
        "0 0 0px rgba(255, 215, 0, 0)",
        "0 0 12px rgba(255, 215, 0, 0.8)",
        "0 0 0px rgba(255, 215, 0, 0)",
      ],
    }}
    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
  />
  <motion.h2
    className="relative z-10 text-6xl font-bold text-yellow-400"
    animate={{
      textShadow: [
        "0 0 0px rgba(255,255,255,0)",
        "0 0 10px rgba(255,255,255,0.7)",
        "0 0 0px rgba(255,255,255,0)",
      ],
    }}
    transition={{ duration: 2, repeat: Infinity }}
  >
    With AI Power
  </motion.h2>
</div>


➡ Creates a glowing border that “runs” softly around the text.

5️⃣ Scroll Fade + Background Animation

You can combine scroll-triggered motion with:

<motion.div
  initial={{ backgroundPosition: "0% 0%" }}
  whileInView={{ backgroundPosition: "0% 100%" }}
  transition={{ duration: 4, ease: "linear" }}
  className="absolute inset-0 bg-[url('/assets/bg-grid-dark.png')] bg-cover"
></motion.div>


This gives a smooth “moving background” illusion when user scrolls.

✨ Final Touches

Add a slight scale-up hover on buttons (whileHover={{ scale: 1.05 }}).

Use transition delays between lines for cinematic intro feel.

Optimize performance by using motion.div only for visible parts.