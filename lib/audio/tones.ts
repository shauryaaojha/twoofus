export class ToneGenerator {
  private ctx: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNode: GainNode | null = null;
  private intervalId: any = null;
  private isPlaying = false;

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Caller hears this (UK/US style ringback: 440Hz + 480Hz, 2s on, 4s off)
  playDialingTone() {
    this.stop();
    this.initContext();
    if (!this.ctx) return;

    this.isPlaying = true;
    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);
    this.gainNode.gain.value = 0.1; // lower volume for comfort

    const playCycle = () => {
      if (!this.isPlaying || !this.ctx || !this.gainNode) return;
      
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      
      osc1.connect(this.gainNode);
      osc2.connect(this.gainNode);
      
      osc1.start();
      osc2.start();
      
      this.oscillators.push(osc1, osc2);

      setTimeout(() => {
        if (!this.isPlaying) return;
        osc1.stop();
        osc2.stop();
        this.oscillators = this.oscillators.filter(o => o !== osc1 && o !== osc2);
      }, 2000);
    };

    playCycle();
    this.intervalId = setInterval(playCycle, 6000); // 2s on, 4s off
  }

  // Receiver hears this (pleasant electronic ringtone)
  playRingTone() {
    this.stop();
    this.initContext();
    if (!this.ctx) return;

    this.isPlaying = true;
    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);
    this.gainNode.gain.value = 0.15;

    const playCycle = () => {
      if (!this.isPlaying || !this.ctx || !this.gainNode) return;

      let time = this.ctx.currentTime;
      
      // Play a quick sequence of notes: C5, E5, G5, C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time + i * 0.1);
        
        const env = this.ctx!.createGain();
        env.gain.setValueAtTime(0, time + i * 0.1);
        env.gain.linearRampToValueAtTime(1, time + i * 0.1 + 0.02);
        env.gain.exponentialRampToValueAtTime(0.01, time + i * 0.1 + 0.3);
        
        osc.connect(env);
        env.connect(this.gainNode!);
        
        osc.start(time + i * 0.1);
        osc.stop(time + i * 0.1 + 0.3);
      });
    };

    playCycle();
    this.intervalId = setInterval(playCycle, 2000); // Repeat every 2 seconds
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.oscillators.forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    this.oscillators = [];
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }
}

export const toneGenerator = typeof window !== 'undefined' ? new ToneGenerator() : null;
