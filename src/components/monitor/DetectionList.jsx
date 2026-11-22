import React from 'react';
import { useStream } from '../../context/StreamContext';
import { Badge, HazardBadge } from '../common/Badge';
import { User, Baby, Shield, AlertTriangle, AlertCircle, Eye, Activity } from 'lucide-react';
import { formatDistance, formatSpeed } from '../../utils/formatters';

export function DetectionList() {
  const { frameData, isStreaming } = useStream();
  const people = frameData?.people || [];

  const childrenCount = people.filter(p => p.is_child).length;
  const adultsCount = people.filter(p => !p.is_child).length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-500" />
            Detected Entities
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time tracking & bounding boxes
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">
            {childrenCount} {childrenCount === 1 ? 'Child' : 'Children'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {adultsCount} {adultsCount === 1 ? 'Adult' : 'Adults'}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {!isStreaming ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <Activity className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs font-medium">Stream is stopped</p>
            <p className="text-[11px] text-slate-500 mt-1">Start stream to resume tracking</p>
          </div>
        ) : people.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <User className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs font-medium">No persons detected in frame</p>
            <p className="text-[11px] text-slate-500 mt-1">Monitoring active field of view</p>
          </div>
        ) : (
          people.map(person => {
            const isDanger = person.level === 'DANGER';
            const isWarning = person.level === 'WARNING';
            const isSupervised = person.level === 'SUPERVISED';

            return (
              <div
                key={person.id}
                className={`p-3.5 rounded-xl border transition-all duration-200 ${
                  isDanger
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 shadow-sm'
                    : isWarning
                    ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                    : isSupervised
                    ? 'bg-cyan-50/30 dark:bg-cyan-950/20 border-cyan-300 dark:border-cyan-800'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Person Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        person.is_child
                          ? 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-600 dark:text-cyan-300'
                          : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300'
                      }`}
                    >
                      {person.is_child ? <Baby className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {person.label}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {person.classification
                          ? `${person.classification}${person.confidence ? ` (${(person.confidence * 100).toFixed(0)}%)` : ''}`
                          : (person.is_child ? 'Pediatric Detection' : 'Adult / Guardian')}
                      </span>
                    </div>
                  </div>

                  <Badge level={person.level} size="sm" pulse={isDanger} />
                </div>

                {/* Details Grid for Child */}
                {person.is_child ? (
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                        Hazard Distance
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatDistance(person.distance_px)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                        Approach Speed
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        {formatSpeed(person.speed)}
                      </span>
                    </div>

                    <div className="col-span-2 flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500">Nearest Zone:</span>
                        {person.zone ? (
                          <HazardBadge type={person.zone} />
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </div>

                      {/* Guardian Proximity Status */}
                      {person.dist_to_adult !== undefined && (
                        <div className="flex items-center gap-1 text-[10px]">
                          {isSupervised ? (
                            <span className="text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1">
                              <Shield className="w-3 h-3" /> Guardian in {person.dist_to_adult}px
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Adult: {person.dist_to_adult ? `${person.dist_to_adult}px away` : 'No adult'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-500">
                    <p className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-500" />
                      Provides supervisor verification within 90px radius
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

