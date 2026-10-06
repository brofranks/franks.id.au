const themeButton = document.querySelector('#toggle-night-mode');
themeButton.setAttribute(
  'aria-pressed',
  String(document.documentElement.classList.contains('night')),
);
themeButton.addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('night');
  localStorage.setItem('colorScheme', dark ? 'dark' : 'light');
  themeButton.setAttribute('aria-pressed', String(dark));
});
