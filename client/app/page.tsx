"use client";

import { Background3D } from "@/components/ui/background-3d";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AnimatedBorderText } from "@/components/ui/animated-border-text";
import {
  Sparkles,
  MessageSquare,
  ImagePlus,
  Wand2,
  Mail,
  Phone,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Background3D />
      <Navbar />
      
      <main className="pt-16">
        <section className="relative min-h-screen flex items-center justify-center px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div 
              className="inline-block"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-6">
                <Sparkles className="w-4 h-4" />
                Powered by AI Magic
              </span>
            </motion.div>
            
            <div>
              <motion.h1 
                className="text-5xl md:text-7xl font-heading font-extrabold leading-tight tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              >
                Create Stunning Images
              </motion.h1>
              
              <AnimatedBorderText>
                With AI Power
              </AnimatedBorderText>
            </div>
            
            <motion.p 
              className="text-lg md:text-xl text-text-dim max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            >
              Transform your ideas into beautiful visuals in seconds. Tasty Banana brings AI-powered creativity to your fingertips.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/media">
                  <Button size="lg">
                    Start Creating Free
                  </Button>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="secondary" size="lg">
                  View Examples
                </Button>
              </motion.div>
            </motion.div>

            <motion.div 
              className="flex items-center justify-center gap-2 pt-8 text-sm text-text-dim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1, ease: "easeOut" }}
            >
              <span>✨</span>
              <span>No credit card required</span>
              <span>•</span>
              <span>100+ images generated daily</span>
            </motion.div>
          </div>
        </section>

        <section id="features" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h2 className="text-3xl md:text-5xl font-heading font-bold mb-4">
                Flexible AI Features
              </h2>
              <p className="text-text-dim text-lg">
                Designed around how teams brief, iterate, and perfect visual ideas
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                whileHover={{ y: -8 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-[10px] bg-accent-mint/10 flex items-center justify-center mb-4">
                      <MessageSquare className="w-6 h-6 text-accent-mint" />
                    </div>
                    <CardTitle>Conversational Creation</CardTitle>
                    <CardDescription>
                      Chat with the model to co-create visuals in real time. Describe, iterate, and refine artwork exactly the way you speak.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={{ y: -8 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-[10px] bg-accent-sky/10 flex items-center justify-center mb-4">
                      <ImagePlus className="w-6 h-6 text-accent-sky" />
                    </div>
                    <CardTitle>Reference Aware Editing</CardTitle>
                    <CardDescription>
                      Drop in existing images to guide edits, remixes, and variations without losing brand or concept consistency.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                whileHover={{ y: -8 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-[10px] bg-accent-orchid/10 flex items-center justify-center mb-4">
                      <Wand2 className="w-6 h-6 text-accent-orchid" />
                    </div>
                    <CardTitle>Prompt Enhancer</CardTitle>
                    <CardDescription>
                      Automatically enrich inputs with stylistic cues, camera language, and detail so every prompt lands perfectly.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-24 px-6 bg-surface">
          <div className="max-w-6xl mx-auto grid gap-10 md:grid-cols-[1.1fr_0.9fr] items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-6"
            >
              <h2 className="text-3xl md:text-5xl font-heading font-bold">
                Pricing that scales with your creative flow
              </h2>
              <p className="text-text-dim text-lg">
                Every studio runs differently. Tell us how many teammates, projects, or brand guardrails you juggle and we’ll tailor a plan that fits.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Talk to sales
                </Button>
                <Button variant="secondary" size="lg" className="gap-2">
                  <Phone className="w-4 h-4" />
                  Book a call
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              <Card className="shadow-glow">
                <CardHeader>
                  <CardTitle>Let’s tailor a plan</CardTitle>
                  <CardDescription>
                    Share your workflow, volumes, and stakeholders. We respond within one business day.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-surface-2 border border-border/60">
                      <p className="text-sm text-text-dim mb-1 uppercase tracking-wide">
                        Collaboration
                      </p>
                      <p className="text-base font-medium text-text">
                        Shared threads, feedback-ready previews, and approvals.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-surface-2 border border-border/60">
                      <p className="text-sm text-text-dim mb-1 uppercase tracking-wide">
                        Controls
                      </p>
                      <p className="text-base font-medium text-text">
                        Usage limits, watermarking, and brand-safe defaults.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-surface-2 border border-border/60">
                      <p className="text-sm text-text-dim mb-1 uppercase tracking-wide">
                        Support
                      </p>
                      <p className="text-base font-medium text-text">
                        Dedicated onboarding and in-product prompt coaching.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-surface-2 border border-border/60">
                      <p className="text-sm text-text-dim mb-1 uppercase tracking-wide">
                        Security
                      </p>
                      <p className="text-base font-medium text-text">
                        Private deployments with audit logs and SSO options.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        <section id="about" className="py-24 px-6 relative overflow-hidden">
          <motion.div 
            className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          />
          
          <div className="max-w-3xl mx-auto text-center space-y-8 relative">
            <motion.h2 
              className="text-3xl md:text-5xl font-heading font-bold"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              Ready to Create Magic?
            </motion.h2>
            <motion.p 
              className="text-text-dim text-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              Join thousands of creators using Tasty Banana to bring their ideas to life
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            >
              <Card className="shadow-glow">
                <CardContent className="pt-6">
                  <form className="flex flex-col sm:flex-row gap-4">
                    <Input 
                      type="email" 
                      placeholder="Enter your email" 
                      className="flex-1"
                    />
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button type="submit" className="sm:w-auto">
                        Get Started
                      </Button>
                    </motion.div>
                  </form>
                  <p className="text-xs text-text-dim mt-4">
                    Start free trial. Cancel anytime. No credit card required.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
