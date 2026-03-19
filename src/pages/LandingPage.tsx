import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, X, Clock, Eye, Shield, Zap, BarChart3, Mail, Users, FileText, TrendingUp, Star, AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Logo, ThemeToggle } from '@/components/nextoffice/shared';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const LandingPage: React.FC = () => {
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '', businessName: '', industry: '', clientCount: '', invoiceMethod: '',
    phone: '', email: '', notes: '',
  });

  const painCards = [
    { icon: Clock, t: "You sent the invoice. Now what?", d: "You check your bank every morning, wondering if you should follow up — worried about damaging the relationship if you do.", accent: 'from-red-500 to-orange-500' },
    { icon: AlertTriangle, t: "The awkward silence costs you money.", d: "You end up discounting just to end the waiting game, losing income not because the work was wrong, but because the conversation felt too difficult.", accent: 'from-amber-500 to-yellow-500' },
    { icon: BarChart3, t: "Cash flow is a monthly guessing game.", d: "You plan expenses by gut feeling and hope the right clients pay on time. Every single month.", accent: 'from-blue-500 to-cyan-500' },
  ];

  const levels = [
    { icon: Star, name: 'Excellent Client', range: '90–100%', desc: 'Always on time or early. Full trust.', gradient: 'from-yellow-500 to-amber-500', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
    { icon: Shield, name: 'Trusted Client', range: '80–89%', desc: 'Reliable. Forecast confidently.', gradient: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
    { icon: TrendingUp, name: 'Reliable Client', range: '66–79%', desc: 'Generally good. Stable and improving.', gradient: 'from-green-500 to-teal-500', bg: 'bg-green-50 dark:bg-green-950/20' },
    { icon: Eye, name: 'Average Client', range: '51–65%', desc: 'Mixed history. Worth watching.', gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-950/20' },
    { icon: AlertTriangle, name: 'At Risk', range: '31–50%', desc: 'Declining pattern. Conversation needed.', gradient: 'from-orange-500 to-red-400', bg: 'bg-orange-50 dark:bg-orange-950/20' },
    { icon: X, name: 'High Risk', range: '0–30%', desc: 'Consistent late payment. Deposit required.', gradient: 'from-red-500 to-rose-600', bg: 'bg-red-50 dark:bg-red-950/20' },
  ];

  const inclusions = [
    'Automated payment reminders', 'Client engagement tracking', 'Reliability scoring system', 'Professional invoice links',
    'Payment response handling', 'Extension requests', 'Payment plan options', 'Owner-defined payment terms',
    'Smart dashboard alerts', 'Relationship intelligence', 'Email automation', 'Quick 2-minute setup',
  ];

  const comparison = [
    { before: 'Manual follow-up calls', after: 'Automated reminder system', icon: Mail },
    { before: 'No tracking of invoice views', after: 'Real-time engagement tracking', icon: Eye },
    { before: 'Awkward payment conversations', after: 'Client self-service options', icon: Users },
    { before: 'Uncertain cash flow', after: 'Reliability-based forecasting', icon: BarChart3 },
    { before: 'Discounting to get paid', after: 'Structured payment plans', icon: FileText },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const body = new FormData(e.target as HTMLFormElement);
      body.append('access_key', '945e3032-c219-41ab-a694-4b9a4405de7c');

      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body,
      });
      const data = await res.json();

      if (data.success) {
        setFormSubmitted(true);
      } else {
        setSubmitError(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200 overflow-x-hidden">
      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-background/70 border-b border-border/50 px-4 sm:px-6 py-3 flex justify-between items-center">
        <Logo />
        <div className="flex items-center gap-3 md:gap-5">
          <ThemeToggle isDark={isDark} toggle={toggle} />
          <button onClick={() => navigate('/signin')} className="text-sm text-muted-foreground font-medium hover:text-foreground transition-colors">Sign In</button>
          <button onClick={() => document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all duration-200 active:scale-[0.97] shadow-lg shadow-primary/25 hidden sm:block">
            Get Started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="relative z-10 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm text-primary text-sm font-medium mb-8">
          <Zap size={14} className="fill-current" />
          Payment Follow-Up Automation · South Africa
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="relative z-10 font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl leading-[1.1] mb-6 text-balance">
          Get paid on time{' '}
          <span className="bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent">
            without the awkward chase.
          </span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          NextOffice automates payment follow-ups within relationship-friendly boundaries you define once. Never chase money again.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
          className="relative z-10 flex flex-col sm:flex-row gap-3">
          <button onClick={() => document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' })}
            className="group px-7 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-all active:scale-[0.97] flex items-center justify-center gap-2 shadow-xl shadow-primary/30">
            Get Started <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-7 py-3.5 rounded-full border border-border text-muted-foreground font-semibold text-base hover:bg-accent hover:text-foreground transition-all">
            See How It Works
          </button>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}
          className="relative z-10 mt-10 flex items-center gap-6 text-xs text-muted-foreground/60">
          <span className="flex items-center gap-1"><Check size={12} className="text-green-500" /> No setup fee</span>
          <span className="flex items-center gap-1"><Check size={12} className="text-green-500" /> No card required</span>
          <span className="flex items-center gap-1"><Check size={12} className="text-green-500" /> Cancel anytime</span>
        </motion.div>
      </section>

      {/* ── Pain Points ── */}
      <section className="py-20 sm:py-28 px-6 max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="text-center mb-14">
          <motion.p variants={fadeUp} className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">The Problem</motion.p>
          <motion.h2 variants={fadeUp} className="font-serif text-3xl md:text-5xl">Sound familiar?</motion.h2>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}
          className="grid md:grid-cols-3 gap-5">
          {painCards.map((card, i) => (
            <motion.div key={i} variants={fadeUp}
              className="group relative rounded-2xl border border-border bg-card p-6 sm:p-8 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.accent} flex items-center justify-center mb-5`}>
                <card.icon size={20} className="text-white" />
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-bold mb-3 leading-snug">{card.t}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{card.d}</p>
            </motion.div>
          ))}
        </motion.div>
        <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="mt-14 text-center font-serif italic text-lg md:text-xl text-primary/80 max-w-3xl mx-auto">
          "Your employees know their salary arrives on time. NextOffice gives you that same certainty — from your clients."
        </motion.p>
      </section>

      {/* ── How It Works ── */}
      <section id="how" className="py-20 sm:py-28 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">How It Works</motion.p>
            <motion.h2 variants={fadeUp} className="font-serif text-3xl md:text-5xl">One product. Two sides. Both protected.</motion.h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              className="rounded-2xl border border-border bg-card p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <Shield size={20} className="text-primary" />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold mb-1">The Owner</h3>
              <p className="text-sm text-muted-foreground mb-5">Set it up once. Stay in control.</p>
              <ul className="space-y-3">
                {['Sets payment terms once (2-minute setup)', 'Creates and sends professional invoice links', 'Sees when clients open invoices and how many times', 'Receives automated extension and payment plan requests', 'Never makes an awkward follow-up call again'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-primary" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              className="rounded-2xl border border-border bg-card p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-5">
                <Users size={20} className="text-blue-500" />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold mb-1">The Client</h3>
              <p className="text-sm text-muted-foreground mb-5">Respected. Empowered. In control.</p>
              <ul className="space-y-3">
                {['Opens a clean professional invoice link on any device', 'Views automatic reliability score based on payment history', 'Requests extensions or payment plans if needed', 'Commits to payment dates that work for their cash flow', 'Maintains professional reputation without pressure'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-blue-500" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="py-20 sm:py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">The Upgrade</motion.p>
            <motion.h2 variants={fadeUp} className="font-serif text-3xl md:text-5xl">Upgrade how you get paid.</motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-3">
            {comparison.map((row, i) => (
              <motion.div key={i} variants={fadeUp}
                className="flex flex-col sm:flex-row items-stretch sm:items-center rounded-xl border border-border overflow-hidden hover:border-primary/30 transition-colors">
                <div className="flex-1 flex items-center gap-3 px-5 py-4 bg-red-50/50 dark:bg-red-950/10">
                  <X size={16} className="text-red-400 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{row.before}</span>
                </div>
                <div className="hidden sm:flex w-10 items-center justify-center bg-muted/50">
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
                <div className="flex-1 flex items-center gap-3 px-5 py-4 bg-green-50/50 dark:bg-green-950/10">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center flex-shrink-0">
                    <row.icon size={12} className="text-white" />
                  </div>
                  <span className="text-sm font-medium">{row.after}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Reliability Levels ── */}
      <section className="py-20 sm:py-28 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Client Scoring</motion.p>
            <motion.h2 variants={fadeUp} className="font-serif text-3xl md:text-5xl mb-4">Your clients have a reputation to protect.</motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground max-w-2xl mx-auto">
              They pay better not because you chase them — because they want to protect their level.
            </motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {levels.map((l, i) => (
              <motion.div key={i} variants={fadeUp}
                className={`rounded-2xl border border-border ${l.bg} p-5 hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${l.gradient} flex items-center justify-center`}>
                    <l.icon size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{l.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{l.range}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{l.desc}</p>
              </motion.div>
            ))}
          </motion.div>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="mt-14 text-center font-serif italic text-lg text-primary/80 max-w-3xl mx-auto">
            "A reliability score builds trust. A payment plan builds relationships. Both build your business."
          </motion.p>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-20 sm:py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.p variants={fadeUp} className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Pricing</motion.p>
            <motion.h2 variants={fadeUp} className="font-serif text-3xl md:text-5xl mb-12">One price. Everything included.</motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="relative rounded-2xl bg-card border border-border shadow-2xl shadow-primary/5 p-6 sm:p-10 md:p-12 overflow-hidden">
            {/* Gradient glow top */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-primary" />
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-40 bg-primary/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-6">
                <Zap size={12} className="fill-current" /> Best Value
              </div>
              <div className="mb-2">
                <span className="text-5xl sm:text-6xl md:text-7xl font-mono font-bold">R299</span>
                <span className="text-lg text-muted-foreground ml-1">/ month</span>
              </div>
              <p className="text-muted-foreground mb-8">per business · unlimited clients · unlimited documents</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 text-left gap-3 mb-10">
                {inclusions.map(item => (
                  <div key={item} className="flex items-center gap-2.5 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-green-500" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-muted/50 border border-border p-4 mb-8 flex flex-col sm:flex-row justify-between items-center text-sm gap-2">
                <span className="text-muted-foreground">Average SA business loses <strong className="text-foreground">R15,000+/month</strong> to late payments</span>
                <span className="font-bold text-primary whitespace-nowrap">NextOffice: R299/mo</span>
              </div>
              <button onClick={() => document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-semibold text-lg hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-primary/25">
                Get Started — R299/month
              </button>
              <div className="mt-5 flex items-center justify-center gap-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Check size={12} className="text-green-500" /> No setup fee</span>
                <span className="flex items-center gap-1"><Check size={12} className="text-green-500" /> No card required</span>
                <span className="flex items-center gap-1"><Check size={12} className="text-green-500" /> Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Request Access Form ── */}
      <section id="join" className="py-20 sm:py-28 px-6 bg-muted/30">
        <div className="max-w-xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger} className="text-center mb-10">
            <motion.p variants={fadeUp} className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Get Started</motion.p>
            <motion.h2 variants={fadeUp} className="font-serif text-3xl md:text-4xl mb-2">Request Access</motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground">We onboard every customer personally. Fill in your details.</motion.p>
          </motion.div>
          {formSubmitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 rounded-2xl border border-border bg-card">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center mx-auto mb-6">
                <Check size={32} className="text-white" />
              </div>
              <h3 className="font-serif text-2xl mb-2">Request received.</h3>
              <p className="text-muted-foreground">We will be in touch within 24 hours to set up your onboarding.</p>
            </motion.div>
          ) : (
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              className="rounded-2xl border border-border bg-card shadow-xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500" />
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <input type="hidden" name="subject" value="New NextOffice Access Request" />
                {[
                  { label: 'Full Name', key: 'fullName', name: 'name', type: 'text', placeholder: 'e.g. John Mokoena' },
                  { label: 'Business Name', key: 'businessName', name: 'business_name', type: 'text', placeholder: 'e.g. Mokoena IT Solutions', optional: true },
                  { label: 'Phone', key: 'phone', name: 'phone', type: 'tel', placeholder: '071 234 5678' },
                  { label: 'Email', key: 'email', name: 'email', type: 'email', placeholder: 'john@example.co.za' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">{f.label}{(f as any).optional ? '' : ' *'}</label>
                    <input type={f.type} name={f.name} required={!(f as any).optional} placeholder={f.placeholder}
                      value={(formData as Record<string, string>)[f.key]}
                      onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Industry</label>
                  <select name="industry" value={formData.industry} onChange={e => setFormData(p => ({ ...p, industry: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm">
                    <option value="">Select...</option>
                    {['Web/Creative', 'IT Support', 'Consulting', 'Security', 'Construction', 'Accounting', 'Cleaning', 'Recruitment', 'Other'].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Clients invoiced monthly</label>
                  <select name="client_count" value={formData.clientCount} onChange={e => setFormData(p => ({ ...p, clientCount: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm">
                    <option value="">Select...</option>
                    {['1–5', '6–15', '16–30', '30+'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Current invoicing method</label>
                  <select name="invoice_method" value={formData.invoiceMethod} onChange={e => setFormData(p => ({ ...p, invoiceMethod: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm">
                    <option value="">Select...</option>
                    {['WhatsApp PDF', 'Email PDF', 'Excel/Word', 'Basic software', 'Not invoicing yet'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Anything else? (optional)</label>
                  <textarea name="message" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    rows={3} placeholder="Tell us about your payment challenges..."
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none transition-all text-sm" />
                </div>
                {submitError && (
                  <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">{submitError}</p>
                )}
                <button type="submit" disabled={isSubmitting}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-semibold text-base hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-primary/25 disabled:opacity-60 disabled:cursor-not-allowed">
                  {isSubmitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </form>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Sticky WhatsApp Button ── */}
      <a
        href="https://wa.me/27789992503?text=Hi%2C%20I'm%20interested%20in%20NextOffice"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/30 hover:scale-110 transition-transform duration-200 active:scale-95"
        title="Chat with us on WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <Logo />
            <p className="text-sm text-muted-foreground mt-2">Get paid on time without the awkward chase.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-5 text-sm text-muted-foreground">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-foreground transition-colors">Home</button>
            <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-foreground transition-colors">How It Works</button>
            <button onClick={() => document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => navigate('/signin')} className="hover:text-foreground transition-colors">Sign In</button>
          </div>
          <p className="text-xs text-muted-foreground/60">Built in South Africa · © 2026 NextOffice</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
