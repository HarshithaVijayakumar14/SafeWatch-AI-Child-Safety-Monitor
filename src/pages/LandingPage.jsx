import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  Video, 
  Eye, 
  BellRing, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  Shield, 
  Baby, 
  Send, 
  Layers, 
  Compass, 
  Sliders, 
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export function LandingPage() {
  const steps = [
    {
      step: '01',
      title: 'Video Input Stream',
      description: 'Ingests RTSP streams, IP CCTV cameras, or browser webcam feeds in real-time at 30 FPS.',
      icon: Video,
      color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800'
    },
    {
      step: '02',
      title: 'Pediatric Detection',
      description: 'YOLOv8 + DeepSORT accurately distinguishes children from adults and tracks continuous trajectories.',
      icon: Baby,
      color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
    },
    {
      step: '03',
      title: 'Hazard Proximity Engine',
      description: 'Raycasting algorithms calculate Euclidean distances to arbitrary polygon hazard zones (water, roads, drains).',
      icon: Compass,
      color: 'text-amber-400 bg-amber-950/60 border-amber-800'
    },
    {
      step: '04',
      title: 'Autonomous Alerting',
      description: 'Instant audible siren, high-priority dashboard banner, and Telegram notifications with snapshot captures.',
      icon: BellRing,
      color: 'text-rose-400 bg-rose-950/60 border-rose-800'
    }
  ];

  const features = [
    {
      title: 'Adult-Nearby Supervisor Check',
      description: 'Avoids annoying false alarms. If a verified adult guardian is within 2 meters of the child, status transitions gracefully to SUPERVISED (teal).',
      icon: Shield,
      badge: 'Smart False Alarm Filter'
    },
    {
      title: 'Approach-Speed Calculation',
      description: 'Differentiates a child strolling from a child sprinting towards a water tank or street curb, triggering earlier predictive warnings.',
      icon: Activity,
      badge: 'Predictive Kinematics'
    },
    {
      title: 'Instant Telegram Bot Alerts',
      description: 'Automated dispatch to Telegram chats with incident timestamp, proximity metric, and high-resolution camera snapshot.',
      icon: Send,
      badge: 'Zero-Latency Push'
    },
    {
      title: 'Arbitrary Polygon Hazard Zones',
      description: 'Draw custom polygonal perimeters for irregular water cisterns, municipal stormwater ditches, and unfenced road curbs.',
      icon: Layers,
      badge: 'Sub-pixel Geometry'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
              <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">SafeWatch</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5">An extra pair of eyes</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/about"
              className="text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition"
            >
              IPCV Architecture
            </Link>
            <Link to="/monitor">
              <Button variant="primary" size="sm" icon={ArrowRight} iconPosition="right">
                Open Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden border-b border-slate-800/60">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-500/15 via-rose-500/10 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 text-xs font-semibold mb-6 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Image Processing & Computer Vision Course Project</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-tight">
            Preventing Child Accidents Near <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
              Unguarded Hazard Zones
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Every year, children drown in open water cisterns or suffer severe injuries near municipal drains and unfenced roads. SafeWatch provides continuous AI surveillance that detects wandering children, measures hazard proximity, and sounds the alarm before tragedy occurs.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/monitor">
              <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right" className="shadow-lg shadow-cyan-500/25">
                Launch Live Monitor Demo
              </Button>
            </Link>
            <Link to="/zones">
              <Button variant="outline" size="lg" icon={Layers}>
                Configure Hazard Zones
              </Button>
            </Link>
          </div>

          {/* Interactive Live Status Indicator Strip */}
          <div className="mt-12 max-w-2xl mx-auto p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-around gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400 font-medium">Standard State:</span>
              <Badge level="SAFE" size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Perimeter Warning:</span>
              <Badge level="WARNING" size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Immediate Danger:</span>
              <Badge level="DANGER" size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Adult Present:</span>
              <Badge level="SUPERVISED" size="sm" />
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step "How it works" section */}
      <section className="py-20 bg-slate-900/40 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 mb-2">
              Autonomous Safety Pipeline
            </h2>
            <h3 className="text-3xl font-bold text-white tracking-tight">
              How SafeWatch Protects Children in 4 Steps
            </h3>
            <p className="text-slate-400 text-sm mt-3">
              Combining state-of-the-art neural object detection with sub-pixel computational geometry to deliver real-time life-saving alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(step => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="relative p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-cyan-500/50 transition-all duration-300 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${step.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-2xl font-black text-slate-700 font-mono">
                        {step.step}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white mb-2">
                      {step.title}
                    </h4>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-[11px] text-cyan-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified in Pipeline
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 mb-2">
              Advanced Safety Intelligence
            </h2>
            <h3 className="text-3xl font-bold text-white tracking-tight">
              Engineered for Real-World Reliability
            </h3>
            <p className="text-slate-400 text-sm mt-3">
              Standard motion sensors create endless false alarms. SafeWatch analyzes human posture, guardian proximity, and approach trajectory.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 hover:border-slate-700 transition shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {feature.badge}
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-white mb-2">
                    {feature.title}
                  </h4>

                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="py-16 bg-gradient-to-b from-transparent to-cyan-950/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-[#0b1b36] to-slate-900 p-8 sm:p-12 border border-cyan-500/30 text-center shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Experience the Live Computer Vision Demo
              </h3>
              <p className="text-sm text-slate-300">
                Test the live detection feed, configure polygonal hazard zones for water tanks, and watch real-time status transitions.
              </p>
              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <Link to="/monitor">
                  <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right">
                    Open Live Monitor
                  </Button>
                </Link>
                <Link to="/about">
                  <Button variant="secondary" size="lg">
                    Read Project Paper & Specs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <p>SafeWatch: AI Child Safety Monitor &copy; 2026. Image Processing and Computer Vision Course Project.</p>
        <p className="mt-1 text-slate-600">Built with React, Vite, Tailwind CSS, Canvas API, and Web Audio API.</p>
      </footer>
    </div>
  );
}

