import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../../utils/sound';

export const SoundToggle: React.FC = () => {
  const [isMuted, setIsMuted] = useState(soundManager.isMuted());

  const handleToggle = () => {
    const newState = soundManager.toggleMute();
    setIsMuted(newState);
  };

  return (
    <button
      onClick={handleToggle}
      title={isMuted ? 'Enable tap haptics & audio' : 'Mute tap audio'}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono-accent text-zinc-400 bg-zinc-900/80 hover:bg-zinc-800 hover:text-amber-400 border border-white/10 transition-colors"
    >
      {isMuted ? (
        <>
          <VolumeX size={14} />
          <span>SOUND OFF</span>
        </>
      ) : (
        <>
          <Volume2 size={14} className="text-amber-400 animate-pulse" />
          <span className="text-amber-400">TAP AUDIO ON</span>
        </>
      )}
    </button>
  );
};
