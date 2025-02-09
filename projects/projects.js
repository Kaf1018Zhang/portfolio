import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

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

    drawPieChart();
});

async function drawPieChart() {
    let projects = await fetchJSON('../lib/projects.json');

    let rolledData = d3.rollups(
        projects,
        (v) => v.length,
        (d) => d.year
    );

    let data = rolledData.map(([year, count]) => ({
        value: count,
        label: year
    }));

    d3.select("#projects-pie-plot").selectAll("*").remove();
    d3.select(".legend").selectAll("*").remove();

    let sliceGenerator = d3.pie().value(d => d.value);
    let arcData = sliceGenerator(data);
    let colorScale = d3.scaleOrdinal(d3.schemeTableau10);
    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

    d3.select("#projects-pie-plot")
      .selectAll("path")
      .data(arcData)
      .join("path")
      .attr("d", arcGenerator)
      .attr("fill", (d, i) => colorScale(i));

    let legend = d3.select('.legend')
        .selectAll("li")
        .data(data)
        .join("li")
        .attr("style", (d, i) => `--color:${colorScale(i)}`)
        .html((d) => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
}
