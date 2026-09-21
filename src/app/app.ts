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
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private pasoMelodia = 0;
  private siguienteNotaEn = 0;

  /**
   * Melodía original de cuna, compuesta para este arreglo (no es la canción
   * comercial «Flores amarillas», que tiene derechos de autor y no puede
   * incluirse en el repositorio). Vals suave en Do mayor: [frecuencia, dura].
   */
  private readonly melodia: Array<[number, number]> = [
    [659.25, 1], // E5
    [783.99, 1], // G5
    [880.0, 1], // A5
    [1046.5, 2], // C6
    [880.0, 1], // A5
    [783.99, 1], // G5
    [659.25, 1], // E5
    [587.33, 2], // D5
    [659.25, 1], // E5
    [783.99, 1], // G5
    [1046.5, 2], // C6
    [783.99, 1], // G5
    [880.0, 1], // A5
    [783.99, 1], // G5
    [659.25, 1], // E5
    [523.25, 2], // C5
  ];

  /** Bajo suave que acompaña cada compás de 3 tiempos. */
  private readonly bajos = [130.81, 174.61, 196.0, 130.81];

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
        g.gain.value = 0.16;
        g.connect(this.contexto!.destination);
        return g;
      })();
      this.siguienteNotaEn = this.contexto.currentTime + 0.1;
      this.pasoMelodia = 0;
      this.temporizador = setInterval(() => this.agendarNotas(), 120);
      this.sonando.set(true);
      this.fuenteMusica.set('Melodía amarilla original 🌼 (pon tu musica.mp3 para tu favorita)');
    } catch {
      this.fuenteMusica.set('Tu navegador no permite audio aquí 😢');
    }
  }

  /** Agenda las notas pendientes con un poco de anticipación. */
  private agendarNotas(): void {
    if (!this.contexto || !this.gananciaMaestra) return;
    const pasoSegundos = 0.42;
    while (this.siguienteNotaEn < this.contexto.currentTime + 0.5) {
      const [frecuencia, dura] = this.melodia[this.pasoMelodia % this.melodia.length];
      this.tocarNota(frecuencia, this.siguienteNotaEn, pasoSegundos * dura, 'triangle', 0.5);
      this.tocarNota(
        frecuencia * 2,
        this.siguienteNotaEn,
        pasoSegundos * dura * 0.6,
        'sine',
        0.12,
      );
      if (this.pasoMelodia % 3 === 0) {
        const bajo = this.bajos[(this.pasoMelodia / 3) % this.bajos.length | 0];
        this.tocarNota(bajo, this.siguienteNotaEn, pasoSegundos * 2.4, 'sine', 0.35);
      }
      this.siguienteNotaEn += pasoSegundos;
      this.pasoMelodia++;
    }
  }

  private tocarNota(
    frecuencia: number,
    cuando: number,
    duracion: number,
    tipo: OscillatorType,
    volumen: number,
  ): void {
    if (!this.contexto || !this.gananciaMaestra) return;
    const oscilador = this.contexto.createOscillator();
    const ganancia = this.contexto.createGain();
    oscilador.type = tipo;
    oscilador.frequency.value = frecuencia;
    ganancia.gain.setValueAtTime(0, cuando);
    ganancia.gain.linearRampToValueAtTime(volumen, cuando + 0.06);
    ganancia.gain.exponentialRampToValueAtTime(0.001, cuando + duracion);
    oscilador.connect(ganancia);
    ganancia.connect(this.gananciaMaestra);
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

