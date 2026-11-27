const KEYBOARD = 'keyboard';

export function trackInputModality(): void {
  const root = document.documentElement;

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      root.dataset.modality = KEYBOARD;
    }
  });

  window.addEventListener('pointerdown', () => {
    delete root.dataset.modality;
  });
}
