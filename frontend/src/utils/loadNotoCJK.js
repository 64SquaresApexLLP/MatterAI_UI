export const loadNotoCJK = () => {
  return new Promise((resolve) => {
    if (document.fonts && document.fonts.check) {
      if (document.fonts.check('12px "Noto Sans CJK SC"')) {
        resolve();
        return;
      }
    }

    const font = new FontFace('Noto Sans CJK SC', 'url(../../public/NotoSansCJKRegular.otf)');

    // const f = import ("../../public/NotoSansCJKRegular.otf")
    
    font.load().then(() => {
      document.fonts.add(font);
      console.log('Noto CJK font loaded successfully');
      resolve();
    }).catch((error) => {
      console.warn('Failed to load Noto CJK font:', error);
      resolve();
    });
  });
};