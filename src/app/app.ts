import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('05_floresamarillas');

  /** ¿Está sonando la música? (botón flotante del arreglo). */
  protected readonly sonando = signal(false);
  /** Mensaje pequeño bajo el botón: qué fuente suena. */
  protected readonly fuenteMusica = signal('');

  private readonly audioMusica = viewChild<ElementRef<HTMLAudioElement>>('audioMusica');

  private contexto: AudioContext | null = null;
  private gananciaMaestra: GainNode | null = null;
  private eco: DelayNode | null = null;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private pasoMelodia = 0;
  private pulso = 0; // tiempos transcurridos dentro del ciclo de 32 tiempos
  private siguienteNotaEn = 0;

  /**
   * Balada romántica original, compuesta para este arreglo (no es la canción
   * comercial «Flores amarillas», que tiene derechos de autor y no puede
   * incluirse en el repositorio). 8 compases en Do mayor, 4/4 lento:
   * [frecuencia, duración en tiempos]. La melodía abraza la progresión
   * Do – La menor – Fa – Sol, la más clásica para decir «te quiero».
   */
  private readonly melodia: Array<[number, number]> = [
    [329.63, 1], // E4 — compás 1 (Do)
    [392.0, 1], // G4
    [523.25, 2], // C5
    [493.88, 2], // B4 — compás 2 (La menor)
    [440.0, 1], // A4
    [392.0, 1], // G4
    [440.0, 2], // A4 — compás 3 (Fa)
    [349.23, 1], // F4
    [329.63, 1], // E4
    [293.66, 3], // D4 — compás 4 (Sol, con tensión dulce)
    [329.63, 1], // E4 (recoge hacia el estribillo)
    [329.63, 1], // E4 — compás 5 (Do, estribillo)
    [392.0, 1], // G4
    [523.25, 2], // C5
    [659.25, 2], // E5 — compás 6 (La menor, el punto más alto)
    [587.33, 1], // D5
    [523.25, 1], // C5
    [587.33, 1], // D5 — compás 7 (Sol)
    [493.88, 1], // B4
    [587.33, 2], // D5
    [523.25, 4], // C5 — compás 8 (Do, final que descansa en casa)
  ];

  /** Un acorde cálido por compás: Do – Lam – Fa – Sol – Do – Lam – Sol – Do. */
  private readonly acordes: number[][] = [
    [130.81, 164.81, 196.0], // Do: C3 E3 G3
    [110.0, 130.81, 164.81], // Lam: A2 C3 E3
    [87.31, 130.81, 174.61], // Fa: F2 C3 F3
    [98.0, 146.83, 196.0], // Sol: G2 D3 G3
    [130.81, 164.81, 196.0], // Do
    [110.0, 130.81, 164.81], // Lam
    [98.0, 146.83, 196.0], // Sol
    [130.81, 164.81, 196.0], // Do final
  ];

  toggleMusica(): void {
    if (this.sonando()) {
      this.detenerTodo();
      return;
    }
    const elemento = this.audioMusica()?.nativeElement;
    if (!elemento) {
      this.iniciarMelodiaOriginal();
      return;
    }
    // Si el usuario puso su propio `public/musica.mp3`, suena ese archivo.
    // Si no existe (o el navegador lo bloquea), usamos la melodía original.
    try {
      elemento.volume = 0.6;
      Promise.resolve(elemento.play())
        .then(() => {
          this.sonando.set(true);
          this.fuenteMusica.set('Sonando tu archivo musica.mp3 💛');
        })
        .catch(() => this.iniciarMelodiaOriginal());
    } catch {
      this.iniciarMelodiaOriginal();
    }
  }

  private iniciarMelodiaOriginal(): void {
    try {
      const Fabrica =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Fabrica) return;
      this.contexto ??= new Fabrica();
      void this.contexto.resume();
      this.gananciaMaestra ??= (() => {
        const g = this.contexto!.createGain();
        g.gain.value = 0.22;
        g.connect(this.contexto!.destination);
        return g;
      })();
      // Eco suave (delay con retroalimentación): la melodía flota, como en una balada.
      this.eco ??= (() => {
        const retardo = this.contexto!.createDelay(1);
        retardo.delayTime.value = 0.42;
        const retro = this.contexto!.createGain();
        retro.gain.value = 0.32;
        const humedo = this.contexto!.createGain();
        humedo.gain.value = 0.22;
        retardo.connect(retro);
        retro.connect(retardo);
        retardo.connect(humedo);
        humedo.connect(this.gananciaMaestra!);
        return retardo;
      })();
      this.siguienteNotaEn = this.contexto.currentTime + 0.15;
      this.pasoMelodia = 0;
      this.pulso = 0;
      this.temporizador = setInterval(() => this.agendarNotas(), 120);
      this.sonando.set(true);
      this.fuenteMusica.set('Balada romántica original 💛 (pon tu musica.mp3 para tu favorita)');
    } catch {
      this.fuenteMusica.set('Tu navegador no permite audio aquí 😢');
    }
  }

  /** Agenda las notas pendientes con un poco de anticipación. */
  private agendarNotas(): void {
    if (!this.contexto || !this.gananciaMaestra) return;
    const pasoSegundos = 0.66; // balada lenta: cada tiempo dura ~2/3 de segundo
    while (this.siguienteNotaEn < this.contexto.currentTime + 0.6) {
      // Colchón cálido: un acorde por compás, con ataque lento de cuerdas.
      if (this.pulso % 4 === 0) {
        const compas = Math.floor(this.pulso / 4) % this.acordes.length;
        for (const nota of this.acordes[compas]) {
          this.tocarNota(nota, this.siguienteNotaEn, pasoSegundos * 4.6, 'sine', 0.09, 1.1);
        }
        // Bajo profundo en la raíz para abrazar el acorde.
        this.tocarNota(
          this.acordes[compas][0] / 2,
          this.siguienteNotaEn,
          pasoSegundos * 4.2,
          'sine',
          0.12,
          0.5,
        );
      }
      // Voz principal: legato dulce con vibrato, como cantada al oído.
      const [frecuencia, dura] = this.melodia[this.pasoMelodia % this.melodia.length];
      const largo = pasoSegundos * dura + 0.35; // las notas se abrazan entre sí
      this.tocarNota(frecuencia, this.siguienteNotaEn, largo, 'sine', 0.4, 0.09, true);
      this.tocarNota(frecuencia, this.siguienteNotaEn, largo, 'triangle', 0.1, 0.12);
      this.tocarNota(frecuencia * 2, this.siguienteNotaEn, largo * 0.7, 'sine', 0.05, 0.15);
      this.siguienteNotaEn += pasoSegundos * dura;
      this.pulso = (this.pulso + dura) % 32; // el ciclo completo dura 32 tiempos
      this.pasoMelodia++;
    }
  }

  private tocarNota(
    frecuencia: number,
    cuando: number,
    duracion: number,
    tipo: OscillatorType,
    volumen: number,
    ataque = 0.06,
    vibrato = false,
  ): void {
    if (!this.contexto || !this.gananciaMaestra) return;
    const oscilador = this.contexto.createOscillator();
    const ganancia = this.contexto.createGain();
    oscilador.type = tipo;
    oscilador.frequency.value = frecuencia;
    if (vibrato) {
      // Temblor dulce de la voz: ±12 cents a 5,5 Hz.
      const lfo = this.contexto.createOscillator();
      const profundidad = this.contexto.createGain();
      lfo.frequency.value = 5.5;
      profundidad.gain.value = 12;
      lfo.connect(profundidad);
      profundidad.connect(oscilador.detune);
      lfo.start(cuando);
      lfo.stop(cuando + duracion + 0.05);
    }
    ganancia.gain.setValueAtTime(0, cuando);
    ganancia.gain.linearRampToValueAtTime(volumen, cuando + ataque);
    ganancia.gain.exponentialRampToValueAtTime(0.001, cuando + duracion);
    oscilador.connect(ganancia);
    ganancia.connect(this.gananciaMaestra);
    if (this.eco) ganancia.connect(this.eco);
    oscilador.start(cuando);
    oscilador.stop(cuando + duracion + 0.05);
  }

  private detenerTodo(): void {
    try {
      this.audioMusica()?.nativeElement.pause();
    } catch {
      // jsdom u otros entornos sin audio: no pasa nada, seguimos deteniendo.
    }
    if (this.temporizador) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
    try {
      void this.contexto?.suspend();
    } catch {
      // Sin AudioContext disponible: no hay nada que suspender.
    }
    this.sonando.set(false);
  }
}

