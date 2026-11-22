import React from 'react';
import { 
  ShieldAlert, 
  Cpu, 
  Layers, 
  Eye, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Workflow, 
  Sparkles,
  ArrowRight,
  Code2,
  HardDrive
} from 'lucide-react';

export function AboutPage() {
  const pipelineSteps = [
    {
      num: '01',
      title: 'Video Ingestion',
      tech: 'WebRTC / RTSP / OpenCV',
      desc: '30 FPS frame sampling with adaptive letterbox downscaling to 640×640 px.'
    },
    {
      num: '02',
      title: 'Pediatric Detection',
      tech: 'YOLOv8n-Pose',
      desc: 'Distinguishes children from adults using skeletal height ratios and anthropometric proportions.'
    },
    {
      num: '03',
      title: 'Temporal Tracking',
      tech: 'DeepSORT / ByteTrack',
      desc: 'Kalman filtering estimates trajectory vectors and eliminates intermittent detection flicker.'
    },
    {
      num: '04',
      title: 'Geometric Containment',
      tech: 'Sub-pixel Raycasting',
      desc: 'Point-in-polygon and Euclidean distance calculations from ground contact points to hazard edges.'
    },
    {
      num: '05',
      title: 'Supervisor Verification',
      tech: 'Guardian Proximity Check',
      desc: 'Calculates inter-person distance. If adult is within 90px radius, status transitions to SUPERVISED.'
    },
    {
      num: '06',
      title: 'Automated Dispatch',
      tech: 'Audio API + Telegram Webhooks',
      desc: 'Audible siren alarm and instant smartphone push notification with captured scene image.'
    }
  ];

  const technologies = [
    { name: 'React 18 & Vite', category: 'Frontend Core', desc: 'Ultra-fast HMR and reactive UI rendering' },
    { name: 'Tailwind CSS', category: 'Styling', desc: 'Custom status design system and dark mode support' },
    { name: 'HTML5 Canvas API', category: 'Visualization', desc: 'Sub-millisecond bounding box and hazard polygon rendering' },
    { name: 'Web Audio API', category: 'Synthesizer', desc: 'Procedural dual-tone siren alarms without external asset dependencies' },
    { name: 'Recharts', category: 'Analytics', desc: 'Responsive temporal risk curves and hazard incident distribution' },
    { name: 'YOLOv8 + DeepSORT', category: 'Computer Vision', desc: 'Real-time multi-pedestrian tracking and pose classification' },
    { name: 'Raycasting Algorithm', category: 'Computational Geometry', desc: 'Non-convex polygon containment and Euclidean edge distance' },
    { name: 'WebRTC / getUserMedia', category: 'Media Stream', desc: 'Direct live camera feed acquisition in modern browsers' },
  ];

  const limitations = [
    {
      title: 'Severe Camera Occlusion',
      desc: 'Dense shrubbery, walls, or furniture blocking the child’s lower torso can impair ground foot point estimation.'
    },
    {
      title: 'Extreme Nighttime / Low-Light Environments',
      desc: 'RGB sensors experience high sensor noise in darkness. Requires infrared (IR) night-vision or thermal camera fusion.'
    },
    {
      title: 'Wide-Angle Fisheye Lens Distortion',
      desc: 'Strong barrel distortion near frame edges alters Euclidean distance metrics unless calibrated using Zhang’s camera matrix.'
    },
    {
      title: 'Edge Compute Power Constraints',
      desc: 'Running high-resolution YOLOv8 models concurrently with 4K video feeds requires NPU accelerators (e.g. Hailo-8 or Jetson Orin Nano).'
    }
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Image Processing & Computer Vision (IPCV) Project
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          SafeWatch: AI Child Safety Monitor
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          "An extra pair of eyes" — An autonomous vision sentry designed to detect toddlers near hazardous perimeters like open water cisterns, municipal drainage trenches, and roadway traffic.
        </p>
      </div>

      {/* Problem Statement Card */}
      <div className="bg-gradient-to-br from-slate-900 to-[#0b132b] text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Problem Motivation & Need</h2>
            <p className="text-xs text-rose-300">Preventing Accidental Child Drownings and Road Hazards</p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Accidental drowning and blunt trauma injuries in rural and peri-urban areas often occur when toddlers wander unattended near uncovered underground cisterns, agricultural sump tanks, open storm drains, and unfenced road verges. Traditional security camera systems are strictly passive: they only record footage for post-accident playback. 
        </p>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          <strong className="text-cyan-300">SafeWatch</strong> converts standard camera infrastructure into an active, proactive guardian. By continuously calculating spatial distance vectors between detected children and user-defined hazard polygons, the system detects dangerous trajectories and alerts caregivers seconds before a fall can occur.
        </p>
      </div>

      {/* Visual Pipeline Flowchart */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Workflow className="w-5 h-5 text-cyan-500" />
            End-to-End Computer Vision Pipeline Architecture
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dataflow from raw video frame ingestion to real-time guardian notification
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pipelineSteps.map(step => (
            <div
              key={step.num}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300">
                    STAGE {step.num}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {step.tech}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Technology Stack Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-500" />
            Technical Stack & Engineering Components
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Frameworks and libraries powering the frontend dashboard and computer vision pipeline
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {technologies.map((t, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block mb-1">
                {t.category}
              </span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                {t.name}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                {t.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Limitations & Future Work */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            System Limitations & Research Horizons
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-world edge cases recognized during IPCV experimental trials
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {limitations.map((lim, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 space-y-1.5"
            >
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                {lim.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {lim.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

