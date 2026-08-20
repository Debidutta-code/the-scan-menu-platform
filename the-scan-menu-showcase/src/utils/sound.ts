// Sound utility using Web Audio API for zero-dependency, high-performance micro-feedback

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private muted: boolean = true;

  constructor() {
    // Audio Context is initialized on first user gesture
  }

  private initCtx() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (!this.muted) {
      this.playTapSound();
    }
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playTapSound() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.audioCtx.currentTime); // A4 note
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.08); // Quick tap slide

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.08);
    } catch {
      // Ignore audioContext errors on restricted browser environments
    }
  }
}

export const soundManager = new SoundManager();
