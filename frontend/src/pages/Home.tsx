import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import {
  Layers,
  ShieldCheck,
  Activity,
  Fingerprint,
  Scan,
  Sparkles,
  CheckCircle2,
  Upload,
  ArrowRight
} from 'lucide-react';
import { scrollToSection } from '../utils/smoothScroll';
import { RobotHero } from '@/components/ui/robot-hero';

// Static card data — defined outside component to avoid re-creation on every render (OPT-4)
// Motion variants hoisted outside component since they contain no dynamic values (OPT-4f)
const fadeUpVariant: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: 'easeOut' }
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
};

const coreCards = [
  {
    id: 'ela',
    title: 'Error Level Analysis (ELA)',
    desc: 'Highlights compression artifacts. Measures differences in JPEG compression error rates across high-frequency boundaries to surface modified regions.',
    badge: 'Quantization matrix differential',
    icon: Layers,
    iconColor: 'text-[#00ffc6]',
    iconBg: 'bg-[#00ffc6]/10 border-[#00ffc6]/25',
    glowColor: 'hover:border-[#00ffc6]/50 hover:shadow-[0_0_30px_rgba(0,255,198,0.2)]',
    accentDot: 'bg-[#00ffc6]'
  },
  {
    id: 'metadata',
    title: 'Metadata & C2PA Extraction',
    desc: 'Verifies digital provenance. Inspects cryptographic Content Credentials manifests, EXIF headers, camera hardware serials, and timestamps.',
    badge: 'Cryptographic manifest validation',
    icon: ShieldCheck,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border-emerald-500/25',
    glowColor: 'hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]',
    accentDot: 'bg-emerald-400'
  },
  {
    id: 'frequency',
    title: 'Frequency & Noise Analysis',
    desc: 'Detects GAN/Diffusion artifacts. Applies 2D Discrete Fourier Transforms (DFT) and Laplacian noise variance to uncover generative upsampling grids.',
    badge: '2D Fourier spectral peak detection',
    icon: Activity,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10 border-purple-500/25',
    glowColor: 'hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]',
    accentDot: 'bg-purple-400'
  },
  {
    id: 'prnu',
    title: 'PRNU Sensor Fingerprinting',
    desc: 'Extracts Photo-Response Non-Uniformity unique to physical camera silicon. Uncovers sensor imperfections and flags spliced regions missing authentic sensor noise.',
    badge: 'Silicon noise fingerprint matching',
    icon: Fingerprint,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10 border-cyan-500/25',
    glowColor: 'hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]',
    accentDot: 'bg-cyan-400'
  },
  {
    id: 'cfa',
    title: 'CFA & Demosaicing Forensics',
    desc: 'Analyzes Color Filter Array (Bayer pattern) interpolation anomalies. Surfaces broken demosaicing traces left when generative elements or faces are spliced.',
    badge: 'Bayer interpolation variance',
    icon: Scan,
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10 border-rose-500/25',
    glowColor: 'hover:border-rose-500/50 hover:shadow-[0_0_30px_rgba(244,63,94,0.2)]',
    accentDot: 'bg-rose-400'
  },
  {
    id: 'diffusion',
    title: 'Neural Diffusion & Deepfake Classifier',
    desc: 'Applies fine-tuned vision transformers and latent diffusion classifiers to recognize synthetic boundary feathering, generative noise schedules, and deepfake swaps.',
    badge: 'Vision transformer feature extraction',
    icon: Sparkles,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/25',
    glowColor: 'hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]',
    accentDot: 'bg-amber-400'
  }
];

// Duplicate cards for seamless continuous infinite looping
const marqueeCards = [...coreCards, ...coreCards];

export const Home: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    scrollToSection(id);
  };

  const handleUploadClick = () => navigate('/analyze');

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        scrollToSection(id);
      }, 150);
    }
  }, [location]);

  return (
    <div className="w-full bg-[#090A0E] min-h-screen text-gray-100 selection:bg-[#00ffc6] selection:text-black">
      {/* ========================================================================= */}
      {/* 1. ROBOT HERO SECTION — 3D Interactive Robot with existing nav/CTA buttons */}
      {/* ========================================================================= */}
      <RobotHero
        backgroundText="AI-FORENSICS"
        navItemsLeft={[
          { label: "Fraud Graph", href: "/graph" },
          { label: "Technology", href: "#technology" },
          { label: "Documentation", href: "#documentation" },
        ]}
        navItemsRight={[
          { label: "Upload Image", href: "#upload", accent: true },
        ]}
        color="#c4c4c4"
        scale={1}
        pantallaColor="#00ffc6"
        pantallaBrillo={1.2}
        blinkCycle={3.0}
        metalness={0.0}
      />

      {/* ========================================================================= */}
      {/* 2. SCROLL REVEAL: CONTINUOUS ROTATING INFINITE CAROUSEL                   */}
      {/* ========================================================================= */}
      <section id="technology" className="py-24 bg-[#0E1017] scroll-mt-6 overflow-hidden relative">
        {/* Transition zone: smooth gradient blend from Hero bg (#090A0E) to Technology bg (#0E1017) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#090A0E] to-[#0E1017] z-0" />

        {/* Upper-left gray radial glow echoing Hero video tone */}
        <div className="pointer-events-none absolute -top-10 left-0 w-[500px] h-[400px] bg-[radial-gradient(ellipse_at_top_left,rgba(120,120,120,0.15),transparent_70%)] z-0" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-70px' }}
          variants={fadeUpVariant}
          className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 mb-12"
        >
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#00ffc6] bg-[#00ffc6]/10 px-3.5 py-1.5 rounded-full border border-[#00ffc6]/30 font-mono">
              Core Inspection Engine
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-4 mb-4 tracking-tight">
              Multi-Layer Forensics Pipeline
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Every analyzed image undergoes rigorous multi-domain signal processing, pixel-level error estimation, and cryptographic provenance checks.
            </p>
          </div>
        </motion.div>

        {/* Infinite Moving Marquee Track (42s Crisp Glide) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative w-full overflow-hidden py-4"
        >
          {/* Left Gradient Fade Mask */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-[#0E1017] via-[#0E1017]/80 to-transparent z-20" />

          {/* Right Gradient Fade Mask */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-[#0E1017] via-[#0E1017]/80 to-transparent z-20" />

          {/* Marquee Animation Strip */}
          <div className="animate-marquee-infinite flex items-stretch gap-6 pl-6 cursor-grab active:cursor-grabbing">
            {marqueeCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={`${card.id}-${index}`}
                  className={`w-[340px] sm:w-[390px] shrink-0 bg-[#151824] rounded-3xl p-8 border border-white/10 shadow-xl ${card.glowColor} transition-all duration-300 flex flex-col justify-between group select-none`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className={`w-12 h-12 rounded-2xl ${card.iconBg} border flex items-center justify-center ${card.iconColor} group-hover:scale-110 transition-transform duration-200 shadow-md`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-gray-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        SIGNAL {String((index % coreCards.length) + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2.5 group-hover:text-[#00ffc6] transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-6">
                      {card.desc}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-medium text-gray-300">
                    <span className={`w-2 h-2 rounded-full ${card.accentDot} animate-pulse`} />
                    <span className="font-mono text-[11px] text-gray-400">{card.badge}</span>
                  </div>
                </div>
              );
            })}
            
          </div>
        </motion.div>

        {/* Subtle Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative z-10 text-center mt-6 text-xs text-gray-500 font-mono"
        >
          <span>← Hover to pause continuous rotation • 6 Core Orthogonal Signals →</span>
        </motion.div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SCROLL REVEAL: DETAILED ARCHITECTURE / WORKFLOW SECTION                */}
      {/* ========================================================================= */}
      <section id="documentation" className="py-20 px-6 sm:px-10 lg:px-16 bg-[#090A0E] scroll-mt-6 overflow-hidden relative">
        {/* Transition zone: smooth gradient blend from Technology bg (#0E1017) to Documentation bg (#090A0E) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#0E1017] to-[#090A0E] z-0" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Staggered list */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-70px' }}
              variants={staggerContainer}
              className="lg:col-span-6 space-y-6"
            >
              <motion.div variants={fadeUpVariant} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>High-Precision Diagnostic Reliability</span>
              </motion.div>

              <motion.h2 variants={fadeUpVariant} className="text-3xl font-bold text-white tracking-tight">
                How our automated forensics engine surfaces synthetic manipulation
              </motion.h2>

              <motion.p variants={fadeUpVariant} className="text-sm text-gray-400 leading-relaxed">
                Modern AI generators like Flux, Midjourney v6, and Stable Diffusion XL leave microscopic frequency residuals and non-uniform noise distributions. Our platform correlates five orthogonal detection pipelines to produce an unambiguous forensic confidence score.
              </motion.p>

              <div className="space-y-4 pt-2">
                <motion.div variants={fadeUpVariant} className="flex items-start gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-[#00ffc6]/10 border border-[#00ffc6]/20 flex items-center justify-center text-[#00ffc6] shrink-0 font-bold text-xs font-mono">
                    01
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Pixel Ingestion & EXIF Extraction</h4>
                    <p className="text-xs text-gray-400 mt-1">Images are normalized in memory and stripped of unsafe binaries while verifying byte offsets.</p>
                  </div>
                </motion.div>

                <motion.div variants={fadeUpVariant} className="flex items-start gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-[#00ffc6]/10 border border-[#00ffc6]/20 flex items-center justify-center text-[#00ffc6] shrink-0 font-bold text-xs font-mono">
                    02
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Multi-Model Spatial & Spectral Passes</h4>
                    <p className="text-xs text-gray-400 mt-1">Concurrently runs ELA error delta, 2D FFT spectral transforms, and generative diffusion signatures.</p>
                  </div>
                </motion.div>

                <motion.div variants={fadeUpVariant} className="flex items-start gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-[#00ffc6]/10 border border-[#00ffc6]/20 flex items-center justify-center text-[#00ffc6] shrink-0 font-bold text-xs font-mono">
                    03
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Weighted Bayesian Aggregation</h4>
                    <p className="text-xs text-gray-400 mt-1">Correlates module predictions into a single, explainable verdict with individual metric breakdowns.</p>
                  </div>
                </motion.div>
              </div>


            </motion.div>

            {/* Right Column: Animated Terminal */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-70px' }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="lg:col-span-6 bg-[#151824] rounded-3xl p-8 border border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-xs font-mono text-gray-400 ml-2">pipeline_inspector.log</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">ONLINE</span>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="p-3.5 bg-[#0D0F16] rounded-2xl border border-white/5">
                  <div className="flex justify-between text-gray-400 mb-1">
                    <span>STAGE 1: INGESTION</span>
                    <span className="text-emerald-400">PASS</span>
                  </div>
                  <div className="text-white font-semibold">C2PA Manifest Check: Verified / Signature Validated</div>
                </div>

                <div className="p-3.5 bg-[#0D0F16] rounded-2xl border border-white/5">
                  <div className="flex justify-between text-gray-400 mb-1">
                    <span>STAGE 2: FREQUENCY TRANSFORM</span>
                    <span className="text-[#00ffc6]">PROCESSED</span>
                  </div>
                  <div className="text-white font-semibold">2D FFT Magnitude: Natural High-Frequency Falloff (94%)</div>
                </div>

                <div className="p-3.5 bg-[#0D0F16] rounded-2xl border border-white/5">
                  <div className="flex justify-between text-gray-400 mb-1">
                    <span>STAGE 3: ERROR LEVEL ANALYSIS</span>
                    <span className="text-[#00ffc6]">PROCESSED</span>
                  </div>
                  <div className="text-white font-semibold">Compression Resave Delta: &lt; 8.4% Variance</div>
                </div>

                <div className="p-4 bg-[#00ffc6]/10 border border-[#00ffc6]/30 text-white rounded-2xl">
                  <div className="text-xs text-[#00ffc6] mb-1 font-mono">FINAL CONFIDENCE VERDICT</div>
                  <div className="text-sm font-bold text-emerald-400 flex items-center justify-between">
                    <span>Authentic Media (Low AI Probability)</span>
                    <span className="text-lg">94.8%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* ========================================================================= */}
      {/* 5. UPLOAD CTA — Single prominent call-to-action section before footer      */}
      {/* ========================================================================= */}
      <section id="upload" className="py-24 px-6 sm:px-10 lg:px-16 bg-[#090A0E] scroll-mt-6 relative overflow-hidden">
        {/* Radial glow background */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[700px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(0,255,198,0.08),transparent_70%)]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >


          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            Upload Your Image
            <span className="block text-[#00ffc6]">Start Scanning Now</span>
          </h2>

          <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-10 max-w-xl mx-auto">
            Drop any photo — ID documents, portraits, social media images — and our multi-layer AI forensics engine will surface deepfakes, splicing, and synthetic generation in seconds.
          </p>

          {/* Main CTA button */}
          <motion.button
            id="main-upload-cta"
            onClick={handleUploadClick}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="group inline-flex items-center gap-3 bg-[#00ffc6] hover:bg-[#00e5b2] text-black font-black text-base sm:text-lg px-10 py-5 rounded-2xl shadow-[0_0_40px_rgba(0,255,198,0.35),0_0_80px_rgba(0,255,198,0.15)] hover:shadow-[0_0_55px_rgba(0,255,198,0.5),0_0_100px_rgba(0,255,198,0.25)] transition-all duration-300"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Your Image</span>
            <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
          </motion.button>


        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 sm:px-10 bg-[#090A0E] text-center text-xs text-gray-500 relative overflow-hidden">
        {/* Transition zone: smooth gradient blend from API bg (#0E1017) to Footer bg (#090A0E) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0E1017] to-[#090A0E] z-0" />

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">AI Forensics</span>
            <span>— Advanced Multi-Model Detection Platform</span>
          </div>
          <p>© 2026 AI Image Forensics Lab. Built for truth seekers.</p>
        </div>
      </footer>
    </div>
  );
};
