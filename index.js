import { fetchJSON, renderProjects, fetchGitHubData } from '/global.js';

document.addEventListener('DOMContentLoaded', async () => {
    const projectsContainer = document.querySelector('.projects');
    const profileStats = document.querySelector('#profile-stats');
    

    if (!projectsContainer) {
        console.error("Error: .projects container not found!");
        return;
    }

    const projects = await fetchJSON('./lib/projects.json');

    if (projects && projects.length > 0) {

        const latestProjects = projects.slice(0, 3);

        renderProjects(latestProjects, projectsContainer, 'h2');
    } else {
        projectsContainer.innerHTML = "<p>No projects available.</p>";
    }

    const githubData = await fetchGitHubData('Kaf1018Zhang');

    if (githubData) {
        profileStats.innerHTML = `
            <dl class="github-stats">
                <div>
                    <dt>FOLLOWERS</dt>
                    <dd>${githubData.followers}</dd>
                </div>
                <div>
                    <dt>FOLLOWING</dt>
                    <dd>${githubData.following}</dd>
                </div>
                <div>
                    <dt>PUBLIC REPOS</dt>
                    <dd>${githubData.public_repos}</dd>
                </div>
                <div>
                    <dt>PUBLIC GISTS</dt>
                    <dd>${githubData.public_gists}</dd>
                </div>
            </dl>
        `;
    } else {
        profileStats.innerHTML = "<p>Failed to load GitHub data.</p>";
    }
    
});

