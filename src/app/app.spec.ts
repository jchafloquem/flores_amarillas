import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the yellow flowers arrangement', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Flores amarillas para ti');
    expect(compiled.querySelector('.carta__dedicatoria')?.textContent).toContain('amor de mi vida');
    expect(compiled.querySelectorAll('.ramo use[href="#flor"]').length).toBe(9);
    expect(compiled.querySelectorAll('.ramo use[href="#hoja"]').length).toBe(10);
    expect(compiled.querySelectorAll('.petalo').length).toBe(16);
  });

  it('should grow the flowers from the vase', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const tallos = Array.from(compiled.querySelectorAll('.ramo path.tallo'));
    expect(tallos.length).toBe(11);
    expect(tallos.filter((tallo) => tallo.getAttribute('pathLength') === '100').length).toBe(11);
    expect(compiled.querySelectorAll('.ramo .brote').length).toBe(9);
    expect(compiled.querySelectorAll('.ramo .brota-hoja').length).toBe(10);
  });

  it('should offer music with a button and an optional audio file', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const boton = compiled.querySelector('.musica__boton');
    expect(boton?.textContent).toContain('Tocar música');
    const audio = compiled.querySelector('audio');
    expect(audio?.getAttribute('src')).toContain('musica.mp3');
    expect(audio?.hasAttribute('loop')).toBe(true);
    // Pulsar el botón no debe romper la página aunque no haya archivo ni AudioContext.
    (boton as HTMLButtonElement | null)?.click();
    await fixture.whenStable();
    expect(compiled.querySelector('.musica')).toBeTruthy();
  });
});
