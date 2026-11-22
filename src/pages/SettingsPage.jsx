import React, { useState, useEffect } from 'react';
import { useStream } from '../context/StreamContext';
import { useTheme } from '../context/ThemeContext';
import { useAlerts } from '../context/AlertContext';
import { api } from '../api/client';
import { Button } from '../components/common/Button';
import { playDangerAlert, playWarningChime } from '../utils/audio';
import { 
  Sliders, 
  Send, 
  Volume2, 
  VolumeX, 
  Moon, 
  Sun, 
  Code2, 
  Copy, 
  Check, 
  Save, 
  RotateCcw, 
  ShieldCheck, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

export function SettingsPage() {
  const { settings, setSettings, soundEnabled, setSoundEnabled } = useStream();
  const { theme, setTheme } = useTheme();
  const { addToast } = useAlerts();

  // Form states
  const [warningDistance, setWarningDistance] = useState(75);
  const [dangerDistance, setDangerDistance] = useState(25);
  const [adultNearbyDistance, setAdultNearbyDistance] = useState(90);
  const [approachSpeedThreshold, setApproachSpeedThreshold] = useState(1.5);
  const [alertCooldown, setAlertCooldown] = useState(15);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [volume, setVolume] = useState(50);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setWarningDistance(settings.warning_distance || 75);
      setDangerDistance(settings.danger_distance || 25);
      setAdultNearbyDistance(settings.adult_nearby_distance || 90);
      setApproachSpeedThreshold(settings.approach_speed_threshold || 1.5);
      setAlertCooldown(settings.alert_cooldown_sec || 15);
      setTelegramToken(settings.telegram_token || '');
      setTelegramChatId(settings.telegram_chat_id || '');
      setVolume(settings.sound_volume ? Math.round(settings.sound_volume * 100) : 50);
    }
  }, [settings]);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://YOUR-DOMAIN';
  const embedSnippet = `<iframe src="${originUrl}/embed" width="800" height="500" allow="camera"></iframe>`;

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    const updated = {
      ...settings,
      warning_distance: Number(warningDistance),
      danger_distance: Number(dangerDistance),
      adult_nearby_distance: Number(adultNearbyDistance),
      approach_speed_threshold: Number(approachSpeedThreshold),
      alert_cooldown_sec: Number(alertCooldown),
      telegram_token: telegramToken.trim(),
      telegram_chat_id: telegramChatId.trim(),
      sound_enabled: soundEnabled,
      sound_volume: volume / 100,
      theme
    };

    try {
      await api.saveSettings(updated);
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Settings save failed', err);
    }
  };

  const handleTestTelegram = () => {
    addToast({
      id: `tg-${Date.now()}`,
      child_id: 'Child-04',
      zone_name: 'Water Tank Perimeter',
      level: 'DANGER',
      distance_px: 14,
      notes: 'Telegram simulated push payload sent via Bot API webhook.',
      timestamp: new Date().toISOString()
    });
  };

  const handleTestSound = () => {
    playDangerAlert(volume / 100);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-cyan-500" />
            System Configuration & Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tune computer vision thresholds, Telegram webhooks, siren alarms, and embed integration
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Save}
          onClick={handleSave}
        >
          {savedSuccess ? 'Settings Saved!' : 'Save Configuration'}
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* 1. Detection Engine Parameters */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Proximity & Detection Parameters
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Kinematic and geometric thresholds used by the sub-pixel raycasting pipeline
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Warning Distance */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Global Warning Distance
                </label>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {warningDistance} px (~{(warningDistance / 50).toFixed(1)}m)
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="180"
                step="5"
                value={warningDistance}
                onChange={(e) => setWarningDistance(e.target.value)}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                Outer buffer perimeter that triggers caution warning state.
              </p>
            </div>

            {/* Danger Distance */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Global Danger Threshold
                </label>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {dangerDistance} px (~{(dangerDistance / 50).toFixed(1)}m)
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={dangerDistance}
                onChange={(e) => setDangerDistance(e.target.value)}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                Critical perimeter distance triggering siren alert and red banner.
              </p>
            </div>

            {/* Adult Nearby Distance */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Adult-Nearby Guardian Radius
                </label>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {adultNearbyDistance} px (~{(adultNearbyDistance / 50).toFixed(1)}m)
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="180"
                step="5"
                value={adultNearbyDistance}
                onChange={(e) => setAdultNearbyDistance(e.target.value)}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                If an adult is detected within this radius of the child, status becomes SUPERVISED.
              </p>
            </div>

            {/* Approach Speed */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Approach-Speed Threshold
                </label>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {approachSpeedThreshold} m/s
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.5"
                step="0.1"
                value={approachSpeedThreshold}
                onChange={(e) => setApproachSpeedThreshold(e.target.value)}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                Fast approach (running towards hazard) escalates warning priority.
              </p>
            </div>

            {/* Alert Cooldown */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Alert Trigger Cooldown
                </label>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {alertCooldown} seconds
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={alertCooldown}
                onChange={(e) => setAlertCooldown(e.target.value)}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                Minimum duration between automated notifications for continuous hazard presence.
              </p>
            </div>

          </div>
        </div>

        {/* 2. Telegram Notifications */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-500" />
                Telegram Instant Bot Notifications
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Dispatches urgent danger alerts and camera snapshots to parents' phones
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Send}
              onClick={handleTestTelegram}
            >
              Test Alert Push
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Telegram Bot Token
              </label>
              <input
                type="password"
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Chat ID or Channel
              </label>
              <input
                type="text"
                placeholder="@safewatch_family or -100123456789"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Audio Siren & Appearance Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Sound Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-rose-500" />
                Audible Alert Siren
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestSound}
              >
                Test Tone
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Synthesized Beep Alarm
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={soundEnabled}
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  soundEnabled ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    soundEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-500 dark:text-slate-400">Alarm Volume</label>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{volume}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Theme Selector */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                Display Theme
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Toggle interface appearance</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                  theme === 'light'
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" /> Light Mode
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                  theme === 'dark'
                    ? 'border-cyan-500 bg-slate-800 text-white ring-2 ring-cyan-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-800 text-slate-400'
                }`}
              >
                <Moon className="w-4 h-4 text-cyan-400" /> Dark Mode
              </button>
            </div>
          </div>

        </div>

        {/* 4. Embed Support */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-500" />
                Embeddable Live Monitor Widget
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Embed the live AI monitor feed directly into external school portals, hospital screens, or home dashboards
              </p>
            </div>
            <a
              href="/embed"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold hover:underline flex items-center gap-1"
            >
              Preview /embed route <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="relative">
            <pre className="p-3.5 rounded-xl bg-slate-950 text-cyan-300 font-mono text-xs overflow-x-auto border border-slate-800">
              {embedSnippet}
            </pre>
            <button
              type="button"
              onClick={handleCopyEmbed}
              className="absolute right-2.5 top-2.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center gap-1.5 transition shadow"
            >
              {copiedEmbed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedEmbed ? 'Copied Snippet' : 'Copy HTML'}
            </button>
          </div>
        </div>

      </form>

    </div>
  );
}

