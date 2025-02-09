/* projects.js */
import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// 全局变量
let projects = [];
let query = '';
let selectedYear = null; // 用年份来标记选中的扇形

document.addEventListener('DOMContentLoaded', async () => {
  const projectsContainer = document.querySelector('.projects');
  const projectsTitle = document.querySelector('.projects-title');
  const searchInput = document.querySelector('.searchBar');

  // 1) 加载本地缓存
  const cached = localStorage.getItem('projects');
  if (cached) {
    projects = JSON.parse(cached);
    renderProjects(projects, projectsContainer, 'h2');
    if (projectsTitle) {
      projectsTitle.textContent = `${projects.length} Projects`;
    }
  }

  // 2) 拉取新的数据
  const fetchedProjects = await fetchJSON('../lib/projects.json');
  if (fetchedProjects?.length) {
    projects = fetchedProjects;
    localStorage.setItem('projects', JSON.stringify(projects));
    renderProjects(projects, projectsContainer, 'h2');
    if (projectsTitle) {
      projectsTitle.textContent = `${projects.length} Projects`;
    }
  }

  // ✅ 初次绘制饼图
  renderPieChart(projects);

  // 搜索功能
  searchInput.addEventListener('input', (event) => {
    query = event.target.value.toLowerCase();
    applyFilters();
  });
});

/* --------------------------------------
 * 先根据搜索框 & 选中年份进行过滤
 * 再渲染列表 & 重绘饼图
 * 若选中的年份已不在新结果里，重置 selectedYear
 * --------------------------------------
 */
function applyFilters() {
  let filtered = projects.filter(item => {
    let str = Object.values(item).join(' ').toLowerCase();
    let matchesSearch = str.includes(query);
    let matchesYear = !selectedYear || item.year === selectedYear;
    return matchesSearch && matchesYear;
  });

  // 如果选中的年份不再可用，重置
  let availableYears = new Set(filtered.map(p => p.year));
  if (selectedYear && !availableYears.has(selectedYear)) {
    selectedYear = null;
  }

  renderProjects(filtered, document.querySelector('.projects'), 'h2');
  renderPieChart(filtered);
}

/* --------------------------------------
 * 用 D3 绘制饼图
 * “选中”逻辑： d.data.label === selectedYear
 * --------------------------------------
 */
function renderPieChart(projectsData) {
  // 年份聚合
  let rolledData = d3.rollups(
    projectsData,
    v => v.length,
    d => d.year
  );

  // 转成 {label, value} 数组
  let data = rolledData.map(([year, count]) => ({
    label: year, value: count
  }));

  // 清空老图
  d3.select("#projects-pie-plot").selectAll("*").remove();
  d3.select(".legend").selectAll("*").remove();

  // 饼图需要的 scale & arc
  let colorScale = d3.scaleOrdinal(d3.schemeTableau10);
  let sliceGenerator = d3.pie().value(d => d.value);
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

  let arcData = sliceGenerator(data);
  let svg = d3.select("#projects-pie-plot");

  // 画出所有 wedges
  svg.selectAll("path")
    .data(arcData)
    .join("path")
    .attr("d", arcGenerator)
    // 关键处：用年份比较
    .attr("fill", d =>
      d.data.label === selectedYear ? "red" : colorScale(d.data.label)
    )
    .classed("selected", d => d.data.label === selectedYear)
    .classed("faded", d => selectedYear && d.data.label !== selectedYear)
    .on("click", (event, d) => {
      // 若已选中，点击则取消；否则选中当前 wedge
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
        // 如果没有选中年份，则悬停时让其他淡化
        d3.selectAll("path").classed("faded", true);
        d3.select(this).classed("faded", false);
      }
    })
    .on("mouseleave", function() {
      if (!selectedYear) {
        d3.selectAll("path").classed("faded", false);
      }
    });

  // 图例
  let legend = d3.select(".legend")
    .selectAll("li")
    .data(data)
    .join("li")
    .attr("style", d => `--color: ${colorScale(d.label)}`)
    .classed("selected", d => d.label === selectedYear)
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
    .on("click", (event, d) => {
      // 同样地，用年份判断
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
        // 找到对应年份的 wedge 取消淡化
        wedgePaths.filter(arc => arc.data.label === d.label)
                  .classed("faded", false);
      }
    })
    .on("mouseleave", function() {
      if (!selectedYear) {
        svg.selectAll("path").classed("faded", false);
      }
    });

  // 确保初次画图时高亮状态也同步
  updatePieSelection(colorScale);
}

/* --------------------------------------
 * updatePieSelection()：根据 selectedYear
 * 给 wedge / legend 设置对应样式
 * --------------------------------------
 */
function updatePieSelection(colorScale) {

}
