let data = [];
let commits = [];

let filteredCommits = [];   
let selectedCommits = [];   

let svg, dots;
let xScale, yScale, timeScale;

let commitProgress = 100;   
let globalMinTime, globalMaxTime;

let NUM_ITEMS = 15; 
let ITEM_HEIGHT = 50;
let VISIBLE_COUNT = 10;
let totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;

const scrollContainer = d3.select("#scroll-container");
const spacer = d3.select("#spacer");
spacer.style("height", `${totalHeight}px`);

const itemsContainer = d3.select("#items-container");
const timeSlider = document.getElementById("timeSlider");
const selectedTimeEl = document.getElementById("selectedTime");

let scrollingActive = false;

const scrollyContainer = d3.select("#scrolly");
const scrollyItems = d3.select("#scrolly-items");


document.addEventListener('DOMContentLoaded', async () => {
  await loadData();        
  processCommits();          
  displayStats();            

  createScatterplot();     
  setupSlider();            

  filterCommitsByTime();
  updateScatterplot();   
  displayCommitFiles(filteredCommits); 

  const scrollContainer = d3.select('#scroll-container');
  const spacer = d3.select('#spacer');
  spacer.style('height', `${totalHeight}px`);
  const itemsContainer = d3.select('#items-container');

  scrollContainer.on("scroll", () => {
    if (scrollingActive) return;
    scrollingActive = true;
  
    const scrollTop = scrollContainer.property("scrollTop");
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
  
    renderItems(startIndex);
    syncSlider(startIndex);
  
    scrollingActive = false;

    renderStory(filteredCommits);
  });
  

});

async function loadData() {
  data = await d3.csv('loc.csv', row => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime)
  }));

  console.log("📊 Loaded data:", data.length > 0 ? data : "No data loaded!");
}


function processCommits() {
  commits = d3.groups(data, d => d.commit).map(([id, lines]) => {
    const first = lines[0];
    let c = {
      id,
      url: 'https://github.com/Kaf1018Zhang/portfolio/commit/' + id,
      author: first.author,
      date: first.date,
      time: first.time,
      timezone: first.timezone,
      datetime: first.datetime,
      hourFrac: first.datetime.getHours() + first.datetime.getMinutes()/60,
      totalLines: lines.length
    };
    Object.defineProperty(c, 'lines', { value: lines, enumerable: false });
    return c;
  });

  [globalMinTime, globalMaxTime] = d3.extent(commits, d => d.datetime);
  console.log("🕒 globalMinTime:", globalMinTime, " globalMaxTime:", globalMaxTime);

  if (!globalMinTime || !globalMaxTime) {
    console.error("❌ ERROR: globalMinTime/globalMaxTime is undefined.");
    return;
  }

  timeScale = d3.scaleTime()
    .domain([globalMinTime, globalMaxTime])
    .range([0, 100]);

  console.log("⏳ Initialized timeScale:", timeScale.domain());
}


function displayStats() {
  const statsEl = d3.select('#stats');
  statsEl.selectAll('*').remove();

  const dl = statsEl.append('dl').attr('class','stats');

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  const fileCount = d3.group(data, d => d.file).size;
  dl.append('dt').text('Number of files');
  dl.append('dd').text(fileCount);

  const avgLineLength = d3.mean(data, d => d.length) || 0;
  dl.append('dt').text('Average line length');
  dl.append('dd').text(avgLineLength.toFixed(2));

  const maxDepth = d3.max(data, d => d.depth) || 0;
  dl.append('dt').text('Max depth');
  dl.append('dd').text(maxDepth);

  const workByPeriod = d3.rollups(
    data,
    v => v.length,
    d => d.datetime.toLocaleString('en', { dayPeriod: 'short' })
  );
  const maxPeriod = d3.greatest(workByPeriod, d => d[1])?.[0] || 'N/A';
  dl.append('dt').text('Most frequent day period');
  dl.append('dd').text(maxPeriod);
}

function createScatterplot() {
  const width = 1000;
  const height = 600;
  const margin = { top:20, right:30, bottom:50, left:70 };
  const usableArea = {
    top: margin.top,
    left: margin.left,
    bottom: height - margin.bottom,
    right: width - margin.right,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };

  const chartEl = d3.select('#chart');
  chartEl.selectAll('svg').remove(); 
  svg = chartEl.append('svg')
    .attr('width','100%')
    .attr('height',height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  xScale = d3.scaleTime()
    .domain([globalMinTime || new Date(), globalMaxTime || new Date()])
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  svg.append('g')
    .attr('class','gridlines')
    .attr('transform', `translate(${usableArea.left},0)`)
    .call(d3.axisLeft(yScale).tickSize(-usableArea.width).tickFormat(''))
    .selectAll('line')
    .style('stroke','#ddd')
    .style('stroke-dasharray','3,3');

  svg.append('g')
    .attr('class','xAxis')
    .attr('transform', `translate(0,${usableArea.bottom})`)
    .call(d3.axisBottom(xScale));

  svg.append('g')
    .attr('transform', `translate(${usableArea.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat(d => String(d%24).padStart(2,'0')+':00'));

  const sortedCommits = d3.sort(commits, d => -d.totalLines);

  dots = svg.append('g').attr('class','dots');

  dots.selectAll('circle')
    .data(sortedCommits, d => d.id)
    .enter()
    .append('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', 0) 
    .style('fill','#1f77b4')
    .style('fill-opacity',0)
    .style('stroke','#333')
    .style('stroke-width',1)
    .on('mouseenter', function(e,d){
      d3.select(this).style('fill-opacity',1).style('stroke','#000');
      updateTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(e);
    })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave', function(e,d){
  
      d3.select(this).style('fill-opacity', filteredCommits.includes(d)?0.75:0)
        .style('stroke','#333');
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });


  const brush = d3.brush().on('start brush end', brushed);
  svg.call(brush);

  svg.selectAll('.dots, .overlay ~ *').raise();
}

function filterCommitsByTime() {
  if (!timeScale || !commits.length) {
    console.warn("⚠️ Skipping filtering: No commits or timeScale.");
    filteredCommits = [];
    return;
  }

  const commitMaxTime = timeScale.invert(commitProgress);
  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);

  console.log("🔎 Filtered commits:", filteredCommits.length, filteredCommits);
}


function updateScatterplot() {
  if (!svg || !xScale || !yScale) return;
  
  if (filteredCommits.length === 0) {
    console.warn("No commits to display in scatterplot.");
    return;
  }
  
  const latestCommitTime = d3.max(filteredCommits, d => d.datetime); 
  xScale.domain([globalMinTime, latestCommitTime]);

  svg.select('.xAxis')
    .transition().duration(300)
    .call(d3.axisBottom(xScale));

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 0])
    .range([3, 40]);

  dots.selectAll('circle')
    .transition().duration(400)
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => filteredCommits.includes(d) ? rScale(d.totalLines) : 0)
    .style('fill-opacity', d => filteredCommits.includes(d) ? 0.75 : 0);
}



function displayCommitFiles(commitsArray) {

  let lines = commitsArray.flatMap(d => d.lines);

  let files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }));

  files = d3.sort(files, f => -f.lines.length);

  let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

  d3.select('.files').selectAll('div').remove();

  let filesContainer = d3.select('.files')
    .selectAll('div')
    .data(files)
    .enter()
    .append('div');

  filesContainer.append('dt')
    .html(d => {

      return `<code>${d.name}</code><small>${d.lines.length} lines</small>`;
    });

  filesContainer.append('dd')
    .selectAll('div')
    .data(d => d.lines)
    .enter()
    .append('div')
    .attr('class','line')

    .style('background', line => fileTypeColors(line.type || 'misc'));
}

function setupSlider() {
  const timeSlider = document.getElementById('timeSlider');
  const selectedTimeEl = document.getElementById('selectedTime');
  if(!timeSlider || !timeScale) return;

  const initTime = timeScale.invert(commitProgress);
  selectedTimeEl.textContent = formatDateTime(initTime);

  timeSlider.addEventListener('input', () => {
    commitProgress = +timeSlider.value;
    const newTime = timeScale.invert(commitProgress);
    selectedTimeEl.textContent = formatDateTime(newTime);

    filterCommitsByTime();
    updateScatterplot();
    displayCommitFiles(filteredCommits);
  });
}

function brushed(e) {
  brushSelection = e.selection;
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}

function isCommitSelected(c) {
  if(!brushSelection) return false;
  const [[x0,y0],[x1,y1]] = brushSelection;
  const cx = xScale(c.datetime);
  const cy = yScale(c.hourFrac);
  return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
}

function updateSelection() {
  d3.selectAll('circle')
    .classed('selected', d => isCommitSelected(d));
}

function updateSelectionCount(){
  const el = document.getElementById('selection-count');
  if(!brushSelection) {
    el.textContent = 'No commits selected';
    return [];
  }
  const s = commits.filter(isCommitSelected);
  el.textContent = (s.length || 'No') + ' commits selected';
  return s;
}

function updateLanguageBreakdown(){
  const container = document.getElementById('language-breakdown');
  container.innerHTML = '';
  if(!brushSelection) return;

  const s = commits.filter(isCommitSelected);
  if(s.length === 0) return;

  const lines = s.flatMap(d => d.lines);
  const breakdown = d3.rollup(lines, v => v.length, d => d.type);

  for(const [language, count] of breakdown){
    let proportion = count / lines.length;
    let formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
}

function updateTooltipContent(commit){
  const linkEl = document.getElementById('commit-link');
  const dateEl = document.getElementById('commit-date');
  const timeEl = document.getElementById('commit-time');
  const authorEl = document.getElementById('commit-author');
  const linesEl = document.getElementById('commit-lines');

  if(!commit || !commit.id){
    linkEl.href = '';
    linkEl.textContent = '';
    dateEl.textContent = '';
    timeEl.textContent = '';
    authorEl.textContent = '';
    linesEl.textContent = '';
    return;
  }

  linkEl.href = commit.url;
  linkEl.textContent = commit.id;
  dateEl.textContent = commit.date
    ? commit.date.toLocaleDateString('en', { dateStyle: 'full' })
    : 'N/A';
  timeEl.textContent = commit.time || 'N/A';
  authorEl.textContent = commit.author || 'Unknown';
  linesEl.textContent = commit.totalLines || '0';
}

function updateTooltipVisibility(show){
  const t = document.getElementById('commit-tooltip');
  if(t) t.hidden = !show;
}

function updateTooltipPosition(e){
  const t = document.getElementById('commit-tooltip');
  if(!t) return;
  const w = t.offsetWidth;
  const h = t.offsetHeight;

  let left = e.clientX + 10;
  let top = e.clientY + 10;

  if(left + w > window.innerWidth) {
    left = e.clientX - w - 10;
  }
  if(top + h > window.innerHeight) {
    top = e.clientY - h - 10;
  }
  t.style.left = left + 'px';
  t.style.top = top + 'px';
}

function formatDateTime(d) {
  return d.toLocaleString('en', {
    dateStyle: 'long',
    timeStyle: 'short'
  });
}

function renderItems(startIndex) {
  itemsContainer.selectAll('div').remove();
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  let newCommitSlice = commits.slice(startIndex, endIndex);

  itemsContainer.selectAll('div')
                .data(newCommitSlice)
                .enter()
                .append('div')
                .attr('class', 'item')
                .html(d => `
                  <p>
                    On ${d.datetime.toLocaleString("en", {dateStyle: "full", timeStyle: "short"})},
                    I made <a href="${d.url}" target="_blank">${d.id.slice(0, 7)}</a>.
                    I edited ${d.totalLines} lines across ${d3.rollups(d.lines, D => D.length, d => d.file).length} files.
                  </p>
                `)
                .style('position', 'absolute')
                .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`);

  filteredCommits = newCommitSlice;
  updateScatterplot();
}


function syncSlider(startIndex) {
  let progress = (startIndex / (commits.length - VISIBLE_COUNT)) * 100;
  timeSlider.value = progress;
  selectedTimeEl.textContent = formatDateTime(commits[startIndex]?.datetime || new Date());
}

function renderStory(commitsToShow) {
  scrollyItems.style("height", `${commitsToShow.length * ITEM_HEIGHT}px`);

  scrollyItems.selectAll(".story-item").remove();

  scrollyItems.selectAll(".story-item")
    .data(commitsToShow)
    .enter()
    .append("div")
    .attr("class", "story-item")
    .html(d => `
      <p>
        On ${d.datetime.toLocaleString("en", {dateStyle: "full", timeStyle: "short"})},
        I made <a href="${d.url}" target="_blank">${d.id.slice(0, 7)}</a>.
        I edited ${d.totalLines} lines across ${d3.rollups(d.lines, D => D.length, d => d.file).length} files.
      </p>
    `);
}
