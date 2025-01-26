console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'resume/', title: 'Resume' },
    { url: 'contact/', title: 'Contact' },
    { url: 'https://github.com/Kaf1018Zhang', title: 'Github'},
];

const ARE_WE_HOME = document.documentElement.classList.contains('home');

let nav = document.createElement('nav');
document.body.prepend(nav);


document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <labelsc class="color-scheme">
      Theme:
      <select id="theme-switch">
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </labelsc>
    `
);  

for (let p of pages) {
    let url = p.url;
    let title = p.title;
    url = !ARE_WE_HOME && !url.startsWith('http') ? '../' + url : url;
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    a.classList.toggle(
        'current',
        a.host === location.host && a.pathname === location.pathname
    );

    if (a.host !== location.host) {
        a.target = '_blank';
    }

    nav.append(a);
}

let currentLink = nav.querySelector(`a[href="${location.pathname === '/' ? '' : location.pathname}"]`);
currentLink?.classList.add('current');

const themeSwitch = document.getElementById('theme-switch');

function applySystemTheme() {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = isDarkMode ? 'dark' : 'light';
    setColorScheme(theme);
}

function setColorScheme(theme) {
    const root = document.documentElement;
    if (theme === 'light dark') {
        applySystemTheme();
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySystemTheme);
    } else {
        root.style.setProperty('color-scheme', theme);
        window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', applySystemTheme);
    }

    localStorage.setItem('color-scheme', theme);
    themeSwitch.value = theme;
}

const savedTheme = localStorage.getItem('color-scheme');
if (savedTheme) {
    setColorScheme(savedTheme);
} else {
    themeSwitch.value = 'light dark';
}

themeSwitch.addEventListener('input', (event) => {
    setColorScheme(event.target.value);
});
