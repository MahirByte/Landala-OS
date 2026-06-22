/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let globalVolume = 0.5; // 0 to 1

export function setSoundVolume(volume: number) {
  globalVolume = Math.max(0, Math.min(1, volume));
}

export function getSoundVolume(): number {
  return globalVolume;
}

// Lazy AudioContext initializer to satisfy browser user-interaction policies
let audioCtx: AudioContext | null = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Creates an ASMR woody "tock" click sound
 */
export function playAsmrClick() {
  if (globalVolume <= 0) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Wood-like physical resonance
    osc.type = 'triangle';
    // Warm low frequency decaying rapidly
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

    // Envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5 * globalVolume, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    // Warm Low-pass filter to make it sound lofi and acoustic
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.12);
    filter.Q.setValueAtTime(8, now);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {
    console.error('Audio synthesis failed:', e);
  }
}

/**
 * Creates a soft high-pitched water-droplet tick sound on hover
 */
export function playAsmrTick() {
  if (globalVolume * 0.3 <= 0) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12 * globalVolume, now + 0.002);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.Q.setValueAtTime(1.5, now);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {
    // Ignore context blocked
  }
}

/**
 * Play a peaceful ambient chord progression as the startup chime
 */
export function playBootChime() {
  if (globalVolume <= 0) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Peaceful pentatonic frequencies (low Root, Fifth, Octave, Ninth, Tenth)
    // Frequencies: C3 (130.81Hz), G3 (196.00Hz), C4 (261.63Hz), D4 (293.66Hz), E4 (329.63Hz), G4 (392.00Hz)
    const notes = [130.81, 196.00, 261.63, 293.66, 329.63, 392.00];

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Delay start slightly for each note to create a rolling harp effect (arpeggio)
      const noteDelay = index * 0.08;
      const startTime = now + noteDelay;
      const duration = 2.5 - noteDelay;

      osc.type = index % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      // Organic vibrato / frequency drift
      osc.frequency.linearRampToValueAtTime(freq - (index % 2 === 0 ? 1 : -1) * 2, startTime + duration);

      // Volume envelope with long warm decay
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2 * globalVolume, startTime + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      // Lowpass lofi filter
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, startTime);
      filter.frequency.exponentialRampToValueAtTime(300, startTime + duration);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
    });
  } catch (e) {
    console.error('Audio chime failed:', e);
  }
}

/**
 * Play a relaxing glass bubble sound for success or system events
 */
export function playBubbleSound() {
  if (globalVolume <= 0) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      const startTime = now + idx * 0.06;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 0.15);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15 * globalVolume, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.2);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  } catch (e) {
    // Ignore
  }
}
