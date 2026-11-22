import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { HazardBadge } from '../common/Badge';
import { Waves, Car, Droplets, Sliders, Shield } from 'lucide-react';

export function ZoneConfigModal({
  isOpen,
  onClose,
  zone,
  onSave
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('water');
  const [warningDistance, setWarningDistance] = useState(75);
  const [dangerDistance, setDangerDistance] = useState(25);
  const [color, setColor] = useState('#0284c7');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (zone) {
      setName(zone.name || '');
      setType(zone.type || 'water');
      setWarningDistance(zone.warning_distance || 75);
      setDangerDistance(zone.danger_distance || 25);
      setColor(zone.color || '#0284c7');
      setDescription(zone.description || '');
      setEnabled(zone.enabled !== false);
    } else {
      setName('New Hazard Perimeter');
      setType('water');
      setWarningDistance(75);
      setDangerDistance(25);
      setColor('#0284c7');
      setDescription('');
      setEnabled(true);
    }
  }, [zone, isOpen]);

  const hazardPresets = [
    { type: 'water', label: 'Water Tank / Cistern / Pool', color: '#0284c7', icon: Waves },
    { type: 'road', label: 'Road / Street / Vehicular Way', color: '#ea580c', icon: Car },
    { type: 'drain', label: 'Open Storm Drain / Canal', color: '#7c3aed', icon: Droplets },
  ];

  const handleTypeSelect = (preset) => {
    setType(preset.type);
    setColor(preset.color);
    if (!name || name === 'New Hazard Perimeter' || hazardPresets.some(h => h.label === name)) {
      setName(preset.label);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      ...zone,
      name: name.trim(),
      type,
      warning_distance: Number(warningDistance),
      danger_distance: Number(dangerDistance),
      color,
      description: description.trim(),
      enabled
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={zone?.id ? 'Configure Hazard Zone' : 'New Hazard Zone Definition'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Zone Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Zone Identifier / Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. North Cistern Perimeter"
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Hazard Category Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Hazard Classification
          </label>
          <div className="grid grid-cols-1 gap-2">
            {hazardPresets.map(preset => {
              const Icon = preset.icon;
              const isSelected = type === preset.type;
              return (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => handleTypeSelect(preset)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-100 ring-1 ring-cyan-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${preset.color}20`, color: preset.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{preset.label}</p>
                    <span className="text-[10px] text-slate-400 capitalize">Type: {preset.type}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Warning Distance Slider */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Warning Perimeter Buffer
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
            onChange={(e) => setWarningDistance(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <p className="text-[10px] text-slate-400 mt-0.5">
            Triggers WARNING status when an unsupervised child enters this outer perimeter.
          </p>
        </div>

        {/* Danger Distance Slider */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Danger Perimeter (Critical Edge)
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
            onChange={(e) => setDangerDistance(Number(e.target.value))}
            className="w-full accent-rose-500 cursor-pointer"
          />
          <p className="text-[10px] text-slate-400 mt-0.5">
            Triggers DANGER status, siren alarm and Telegram alerts.
          </p>
        </div>

        {/* Active Toggle & Description */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Zone Active in Inference Engine
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
              enabled ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
          >
            Save Hazard Zone
          </Button>
        </div>
      </form>
    </Modal>
  );
}

