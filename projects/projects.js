import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let projects = [];
let query = '';
let selectedYear = null;

document.addEventListener('DOMContentLoaded', async () => {
  const projectsContainer = document.querySelector('.projects');
  const projectsTitle = document.querySelector('.projects-title');
  const searchInput = document.querySelector('.searchBar');

  const cached = localStorage.getItem('projects');
  if (cached) {
    projects = JSON.parse(cached);
    renderProjects(projects, projectsContainer, 'h2');
    if (projectsTitle) {
      projectsTitle.textContent = `${projects.length} Projects`;
    }
  }

  const fetchedProjects = await fetchJSON('../lib/projects.json');
  if (fetchedProjects?.length) {
    projects = fetchedProjects;
    localStorage.setItem('projects', JSON.stringify(projects));
    renderProjects(projects, projectsContainer, 'h2');
    if (projectsTitle) {
      projectsTitle.textContent = `${projects.length} Projects`;
    }
  }

  renderPieChart(projects);

  searchInput.addEventListener('input', (event) => {
    query = event.target.value.toLowerCase();
    applyFilters();
  });
});

function applyFilters() {
  let filtered = projects.filter(item => {
    let str = Object.values(item).join(' ').toLowerCase();
    let matchesSearch = str.includes(query);
    let matchesYear = !selectedYear || item.year === selectedYear;
    return matchesSearch && matchesYear;
  });

  let availableYears = new Set(filtered.map(p => p.year));
  if (selectedYear && !availableYears.has(selectedYear)) {
    selectedYear = null;
  }

  renderProjects(filtered, document.querySelector('.projects'), 'h2');
  renderPieChart(filtered);
}


function renderPieChart(projectsData) {

  let rolledData = d3.rollups(
    projectsData,
    v => v.length,
    d => d.year
  );

  let data = rolledData.map(([year, count]) => ({
    label: year, value: count
  }));

  d3.select("#projects-pie-plot").selectAll("*").remove();
  d3.select(".legend").selectAll("*").remove();

  let colorScale = d3.scaleOrdinal(d3.schemeTableau10);
  let sliceGenerator = d3.pie().value(d => d.value);
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

  let arcData = sliceGenerator(data);
  let svg = d3.select("#projects-pie-plot");

  svg.selectAll("path")
    .data(arcData)
    .join("path")
    .attr("d", arcGenerator)

    .attr("fill", d =>
      d.data.label === selectedYear ? "red" : colorScale(d.data.label)
    )
    .classed("selected", d => d.data.label === selectedYear)
    .classed("faded", d => selectedYear && d.data.label !== selectedYear)
    .on("click", (event, d) => {

      if (selectedYear === d.data.label) {
        selectedYear = null;
      } else {
        selectedYear = d.data.label;
      }
      applyFilters();
      updatePieSelection(colorScale);
    })
    .on("mouseenter", function() {
      if (!selectedYear) {

        d3.selectAll("path").classed("faded", true);
        d3.select(this).classed("faded", false);
      }
    })
    .on("mouseleave", function() {
      if (!selectedYear) {
        d3.selectAll("path").classed("faded", false);
      }
    });


  let legend = d3.select(".legend")
    .selectAll("li")
    .data(data)
    .join("li")
    .attr("style", d => `--color: ${colorScale(d.label)}`)
    .classed("selected", d => d.label === selectedYear)
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
    .on("click", (event, d) => {

      if (selectedYear === d.label) {
        selectedYear = null;
      } else {
        selectedYear = d.label;
      }
      applyFilters();
      updatePieSelection(colorScale);
    })
    .on("mouseenter", function(_, d) {
      if (!selectedYear) {
        let wedgePaths = svg.selectAll("path");
        wedgePaths.classed("faded", true);

        wedgePaths.filter(arc => arc.data.label === d.label)
                  .classed("faded", false);
      }
    })
    .on("mouseleave", function() {
      if (!selectedYear) {
        svg.selectAll("path").classed("faded", false);
      }
    });

  updatePieSelection(colorScale);
}

function updatePieSelection(colorScale) {

}
