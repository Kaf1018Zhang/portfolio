let data=[]
let commits=[]
let xScale,yScale
let svg,dots
let brushSelection=null
async function loadData(){
  data=await d3.csv('loc.csv',row=>({
    ...row,
    line:Number(row.line),
    depth:Number(row.depth),
    length:Number(row.length),
    date:new Date(row.date+'T00:00'+row.timezone),
    datetime:new Date(row.datetime)
  }))
  displayStats()
  createScatterplot()
}
function displayStats(){
  processCommits()
  const dl=d3.select('#stats').append('dl').attr('class','stats')
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>')
  dl.append('dd').text(data.length)
  dl.append('dt').text('Total commits')
  dl.append('dd').text(commits.length)
  const fileCount=d3.group(data,d=>d.file).size
  dl.append('dt').text('Number of files')
  dl.append('dd').text(fileCount)
  const avgLineLength=d3.mean(data,d=>d.length)
  dl.append('dt').text('Average line length')
  dl.append('dd').text(avgLineLength.toFixed(2))
  const maxDepth=d3.max(data,d=>d.depth)
  dl.append('dt').text('Max depth')
  dl.append('dd').text(maxDepth)
  const workByPeriod=d3.rollups(data,v=>v.length,d=>new Date(d.datetime).toLocaleString('en',{dayPeriod:'short'}))
  const maxPeriod=d3.greatest(workByPeriod,d=>d[1])?.[0]||'N/A'
  dl.append('dt').text('Most frequent day period')
  dl.append('dd').text(maxPeriod)
}
function processCommits(){
  commits=d3.groups(data,d=>d.commit).map(([commit,lines])=>{
    let f=lines[0]
    let r={
      id:commit,
      url:'https://github.com/Kaf1018Zhang/portfolio/commit/'+commit,
      author:f.author,
      date:f.date,
      time:f.time,
      timezone:f.timezone,
      datetime:f.datetime,
      hourFrac:f.datetime.getHours()+f.datetime.getMinutes()/60,
      totalLines:lines.length
    }
    Object.defineProperty(r,'lines',{value:lines,enumerable:false,writable:false,configurable:false})
    return r
  })
}
function createScatterplot(){
  const width=1000
  const height=600
  const margin={top:20,right:30,bottom:50,left:70}
  const usableArea={
    top:margin.top,
    left:margin.left,
    bottom:height-margin.bottom,
    right:width-margin.right,
    width:width-margin.left-margin.right,
    height:height-margin.top-margin.bottom
  }
  svg=d3.select('#chart').append('svg')
    .attr('width','100%')
    .attr('height',height)
    .attr('viewBox','0 0 '+width+' '+height)
    .style('overflow','hidden')
  xScale=d3.scaleTime()
    .domain(d3.extent(commits,d=>d.datetime))
    .range([usableArea.left,usableArea.right])
    .nice()
  yScale=d3.scaleLinear()
    .domain([0,24])
    .range([usableArea.bottom,usableArea.top])
  svg.append('g')
    .attr('class','gridlines')
    .attr('transform','translate('+usableArea.left+',0)')
    .call(d3.axisLeft(yScale).tickSize(-usableArea.width).tickFormat(''))
    .selectAll('line')
    .style('stroke','#ddd')
    .style('stroke-dasharray','3,3')
  svg.append('g')
    .attr('transform','translate(0,'+usableArea.bottom+')')
    .call(d3.axisBottom(xScale))
  svg.append('g')
    .attr('transform','translate('+usableArea.left+',0)')
    .call(d3.axisLeft(yScale).tickFormat(d=>String(d%24).padStart(2,'0')+':00'))
  const[minLines,maxLines]=d3.extent(commits,d=>d.totalLines)
  const rScale=d3.scaleSqrt().domain([minLines,maxLines]).range([3,40])
  const sortedCommits=d3.sort(commits,d=>-d.totalLines)
  dots=svg.append('g').attr('class','dots')
  dots.selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx',d=>xScale(d.datetime))
    .attr('cy',d=>yScale(d.hourFrac))
    .attr('r',d=>rScale(d.totalLines))
    .style('fill','#1f77b4')
    .style('fill-opacity',0.75)
    .style('stroke','#333')
    .style('stroke-width',1)
    .on('mouseenter',function(e,d){
      d3.select(this).style('fill-opacity',1).style('stroke','#000')
      updateTooltipContent(d)
      updateTooltipVisibility(true)
      updateTooltipPosition(e)
    })
    .on('mousemove',updateTooltipPosition)
    .on('mouseleave',function(){
      d3.select(this).style('fill-opacity',0.75).style('stroke','#333')
      updateTooltipContent({})
      updateTooltipVisibility(false)
    })
  const brush=d3.brush().on('start brush end',brushed)
  d3.select(svg.node()).call(brush)
  d3.select(svg.node()).selectAll('.dots, .overlay ~ *').raise()
}
function updateTooltipContent(commit){
  const linkEl=document.getElementById('commit-link')
  const dateEl=document.getElementById('commit-date')
  const timeEl=document.getElementById('commit-time')
  const authorEl=document.getElementById('commit-author')
  const linesEl=document.getElementById('commit-lines')
  if(!commit||Object.keys(commit).length===0){
    linkEl.href=''
    linkEl.textContent=''
    dateEl.textContent=''
    timeEl.textContent=''
    authorEl.textContent=''
    linesEl.textContent=''
    return
  }
  linkEl.href=commit.url
  linkEl.textContent=commit.id||'Unknown'
  dateEl.textContent=commit.date?commit.date.toLocaleDateString('en',{dateStyle:'full'}):'N/A'
  timeEl.textContent=commit.time||'N/A'
  authorEl.textContent=commit.author||'Unknown'
  linesEl.textContent=commit.totalLines||'0'
}
function updateTooltipVisibility(b){
  const t=document.getElementById('commit-tooltip')
  t.hidden=!b
}
function updateTooltipPosition(e){
  const t=document.getElementById('commit-tooltip')
  const w=t.offsetWidth
  const h=t.offsetHeight
  let left=e.clientX+10
  let top=e.clientY+10
  if(left+w>window.innerWidth) left=e.clientX-w-10
  if(top+h>window.innerHeight) top=e.clientY-h-10
  t.style.left=left+'px'
  t.style.top=top+'px'
}
function brushed(e){
  brushSelection=e.selection
  updateSelection()
  updateSelectionCount()
  updateLanguageBreakdown()
}
function isCommitSelected(c){
  if(!brushSelection)return false
  const[[x0,y0],[x1,y1]]=brushSelection
  const cx=xScale(c.datetime)
  const cy=yScale(c.hourFrac)
  return x0<=cx&&cx<=x1&&y0<=cy&&cy<=y1
}
function updateSelection(){
  d3.selectAll('circle').classed('selected',d=>isCommitSelected(d))
}
function updateSelectionCount(){
  const el=document.getElementById('selection-count')
  if(!brushSelection){
    el.textContent='No commits selected'
    return[]
  }
  const selectedCommits=commits.filter(isCommitSelected)
  el.textContent=(selectedCommits.length||'No')+' commits selected'
  return selectedCommits
}
function updateLanguageBreakdown(){
  const container=document.getElementById('language-breakdown')
  container.innerHTML=''
  if(!brushSelection)return
  const selectedCommits=commits.filter(isCommitSelected)
  if(selectedCommits.length===0)return
  const lines=selectedCommits.flatMap(d=>d.lines)
  const breakdown=d3.rollup(lines,v=>v.length,d=>d.type)
  for(const[language,count]of breakdown){
    const proportion=count/lines.length
    const formatted=d3.format('.1~%')(proportion)
    container.innerHTML+=`
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `
  }
}
document.addEventListener('DOMContentLoaded',async()=>{await loadData()})
