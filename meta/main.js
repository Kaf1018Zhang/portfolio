let data = [];
let commits = [];
let xScale, yScale;
let svg, dots;

function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    if (!commit || Object.keys(commit).length === 0) {
        link.textContent = "";
        date.textContent = "";
        time.textContent = "";
        author.textContent = "";
        lines.textContent = "";
        return;
    }

    link.href = commit.url;
    link.textContent = commit.id || "Unknown";
    date.textContent = commit.date ? commit.date.toLocaleDateString('en', { dateStyle: 'full' }) : "N/A";
    time.textContent = commit.time || "N/A";
    author.textContent = commit.author || "Unknown";
    lines.textContent = commit.totalLines || "0";
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;

    let left = event.clientX + 10;
    let top = event.clientY + 10;

    if (left + tooltipWidth > window.innerWidth) {
        left = event.clientX - tooltipWidth - 10;
    }

    if (top + tooltipHeight > window.innerHeight) {
        top = event.clientY - tooltipHeight - 10;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    console.log(data);
    processCommits();
    displayStats();
    createScatterplot();
}

function processCommits() {
    commits = d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
        let first = lines[0]; 
        let { author, date, time, timezone, datetime } = first;

        return {
            id: commit,
            url: 'https://github.com/YOUR_REPO/commit/' + commit,
            author,
            date,
            time,
            timezone,
            datetime,
            hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
            totalLines: lines.length, 
        };
    });

    console.log(commits);
}

function displayStats() {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
}

function createScatterplot() {
    const width = 1000;
    const height = 600;
    const margin = { top: 20, right: 30, bottom: 50, left: 70 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    svg = d3.select('#chart').append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'hidden');

    xScale = d3.scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3.scaleLinear().domain([0, 24]).range([usableArea.bottom, usableArea.top]);

    svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(d3.axisLeft(yScale)
            .tickSize(-usableArea.width)
            .tickFormat(""))
        .selectAll('line')
        .style('stroke', '#ddd') 
        .style('stroke-dasharray', '3,3');

    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('font-size', '12px')
        .style('fill', '#555');

    svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(d3.axisLeft(yScale).tickFormat((d) => `${String(d % 24).padStart(2, '0')}:00`))
        .selectAll('text')
        .style('font-size', '12px')
        .style('fill', '#555');

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

    const rScale = d3.scaleSqrt()
        .domain([minLines, maxLines])
        .range([3, 40]); 

    const dotColor = "#1f77b4"; 

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    dots = svg.append('g').attr('class', 'dots');

    dots.selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .style('fill', dotColor) 
        .style('fill-opacity', 0.75)
        .style('stroke', '#333') 
        .style('stroke-width', 1)
        .on('mouseenter', function (event, d) {
            d3.select(event.currentTarget)
                .style('fill-opacity', 1)
                .style('stroke', '#000');
            updateTooltipContent(d);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mousemove', updateTooltipPosition)
        .on('mouseleave', function () {
            d3.select(event.currentTarget)
                .style('fill-opacity', 0.75)
                .style('stroke', '#333');
            updateTooltipContent({});
            updateTooltipVisibility(false);
        });
}


document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});
