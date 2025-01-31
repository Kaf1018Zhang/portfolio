import { fetchJSON, renderProjects } from '../global.js';

document.addEventListener('DOMContentLoaded', async () => {
    const projectsContainer = document.querySelector('.projects');
    const projectsTitle = document.querySelector('.projects-title');

    if (!projectsContainer) {
        console.error("Error: .projects container not found!");
        return;
    }

    const fallbackProjects = [
        { title: "Default Project", image: "default.png", description: "This is a default project." }
    ];

    const cachedProjects = localStorage.getItem('projects');
    if (cachedProjects) {
        const projectsData = JSON.parse(cachedProjects);
        console.log("Loaded projects from cache.");
        renderProjects(projectsData, projectsContainer, 'h2');

        if (projectsTitle) {
            projectsTitle.textContent = `${projectsData.length} Projects`;
        }
    }

    const projects = await fetchJSON('../lib/projects.json');

    if (projects && projects.length > 0) {
        localStorage.setItem('projects', JSON.stringify(projects));

        renderProjects(projects, projectsContainer, 'h2');

        if (projectsTitle) {
            projectsTitle.textContent = `${projects.length} Projects`;
        }
    } else {
        console.warn("Using fallback projects.");
        renderProjects(fallbackProjects, projectsContainer, 'h2');

        if (projectsTitle) {
            projectsTitle.textContent = `Projects (${fallbackProjects.length})`;
        }
    }
});
