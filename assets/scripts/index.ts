(() => {
  const skinSelectorEl = document.getElementById('skin-selector');
  // change skin
  skinSelectorEl.addEventListener('change', () => {
    const skin = (skinSelectorEl as any).value as string;
    document.body.setAttribute('data-theme', skin);
    localStorage.setItem('UNISTYLUS_SKIN', skin);
  });
  // load local skin
  const localSkin = localStorage.getItem('UNISTYLUS_SKIN');
  if (localSkin) {
    (skinSelectorEl as any).value = localSkin;
    document.body.setAttribute('data-theme', localSkin);
  }
})();
