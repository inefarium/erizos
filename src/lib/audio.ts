export type TonoCorazon = 'alto' | 'bajo';

let audioCtx: AudioContext | null = null;

export function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) throw new Error('Web Audio API no disponible');
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

export function sonarCyberpunk(pitch: TonoCorazon): void {
  try {
    reproducirTono(pitch);
  } catch {
    // Sin Web Audio el sitio sigue funcionando en silencio.
  }
}

function reproducirTono(pitch: TonoCorazon): void {
  const ctx = getAudioCtx();
  const ahora = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.16;
  master.connect(ctx.destination);

  const eco = ctx.createDelay();
  eco.delayTime.value = 0.32;
  const ecoFeedback = ctx.createGain();
  ecoFeedback.gain.value = 0.35;
  const ecoFiltro = ctx.createBiquadFilter();
  ecoFiltro.type = 'lowpass';
  ecoFiltro.frequency.value = 1800;

  master.connect(eco);
  eco.connect(ecoFiltro);
  ecoFiltro.connect(ecoFeedback);
  ecoFeedback.connect(eco);
  eco.connect(ctx.destination);

  const base = pitch === 'alto' ? 660 : 330;
  [1, 1.5].forEach((mult, i) => {
    const osc = ctx.createOscillator();
    osc.type = i === 0 ? 'sine' : 'triangle';
    osc.frequency.value = base * mult;

    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(2200, ahora);
    filtro.frequency.exponentialRampToValueAtTime(500, ahora + 1.1);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, ahora);
    env.gain.linearRampToValueAtTime(i === 0 ? 0.35 : 0.18, ahora + 0.08);
    env.gain.exponentialRampToValueAtTime(0.001, ahora + 1.2);

    osc.connect(filtro);
    filtro.connect(env);
    env.connect(master);

    osc.start(ahora);
    osc.stop(ahora + 1.2);
  });
}
