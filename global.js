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

export async function fetchJSON(url) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
        return null; 
    }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    if (!containerElement) {
        console.error("Error: containerElement is null or undefined.");
        return;
    }

    containerElement.innerHTML = '';

    projects.forEach((project) => {
        const article = document.createElement('article');

        const validHeadingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        const headingTag = validHeadingLevels.includes(headingLevel) ? headingLevel : 'h2';

        article.innerHTML = `
            <${headingTag}>${project.title}</${headingTag}>
            <img src="${project.image || 'default.png'}" alt="${project.title || 'No title'}">
            <p>${project.description || 'No description available'}</p>
        `;

        containerElement.appendChild(article);
    });
}

export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/Kaf1018Zhang`);
}

