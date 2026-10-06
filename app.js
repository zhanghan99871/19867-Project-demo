const D=window.DEMO_DATA;
const flowMethods=D.optimizerKeys;
const fmtInt=new Intl.NumberFormat('en-US',{maximumFractionDigits:0});
const fmtCompact=new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1});
const select=document.getElementById('optimizerSelect');
flowMethods.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=D.metrics[k].label;select.appendChild(o)});
select.value='binary_edge';
const dateSlider=document.getElementById('dateSlider');dateSlider.max=D.dates.length-1;dateSlider.value=0;
const dateLabel=document.getElementById('dateLabel');dateLabel.textContent=D.dates[0];
const edgeSlider=document.getElementById('edgeSlider');
const edgeLabel=document.getElementById('edgeLabel');
const networkMode=document.getElementById('networkMode');
const dateControl=document.getElementById('dateControl');

const palette={binary_edge:'#1f77b4',continuous_edge:'#d62728',binary_node:'#2ca02c',cluster:'#9467bd'};
const clusterColors=['#2b83ba','#22b8c7','#a66b5b'];
const STATE_FIPS={PA:'42',NY:'36',NJ:'34',DE:'10',MD:'24',WV:'54',OH:'39',VA:'51',KY:'21',MI:'26'};
const FIPS_TO_NODE=Object.fromEntries(Object.entries(STATE_FIPS).map(([abbr,fips])=>[fips,abbr]));
const MAP_DATA_URL='https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
let selectedStateFeatures=[];
let mapReady=false;

function matrixFor(key){return networkMode.value==='daily'?D.flows[key][+dateSlider.value]:D.aggregate[key]}
function topEdges(matrix,n){const e=[];for(let i=0;i<matrix.length;i++)for(let j=0;j<matrix[i].length;j++)if(i!==j&&matrix[i][j]>0)e.push({i,j,v:matrix[i][j]});return e.sort((a,b)=>b.v-a.v).slice(0,n)}

async function loadPhysicalMap(){
  const container=document.getElementById('network');
  container.innerHTML='<div class="map-status">Loading physical state map…</div>';
  try{
    const topo=await fetch(MAP_DATA_URL).then(r=>{if(!r.ok)throw new Error(`Map download failed (${r.status})`);return r.json()});
    const features=topojson.feature(topo,topo.objects.states).features;
    selectedStateFeatures=features.filter(f=>FIPS_TO_NODE[String(f.id).padStart(2,'0')]);
    mapReady=selectedStateFeatures.length===D.nodes.length;
    if(!mapReady)throw new Error(`Expected ${D.nodes.length} states, loaded ${selectedStateFeatures.length}`);
    drawNetwork();
  }catch(err){
    console.error(err);
    container.innerHTML='<div class="map-status map-error">Could not load the physical state map. Check your internet connection and reload.</div>';
  }
}

function curvePath(a,b,bend=0.17){
  const dx=b[0]-a[0],dy=b[1]-a[1];
  const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
  const len=Math.hypot(dx,dy)||1;
  const nx=-dy/len,ny=dx/len;
  const offset=Math.min(42,len*bend);
  return `M${a[0]},${a[1]} Q${mx+nx*offset},${my+ny*offset} ${b[0]},${b[1]}`;
}

function drawNetwork(){
  if(!mapReady)return;
  const container=document.getElementById('network');
  const key=select.value,m=matrixFor(key),edges=topEdges(m,+edgeSlider.value);
  const width=Math.max(container.clientWidth,620),height=Math.max(container.clientHeight,420);
  container.innerHTML='';

  const svg=d3.select(container).append('svg')
    .attr('class','mobility-map')
    .attr('viewBox',`0 0 ${width} ${height}`)
    .attr('role','img')
    .attr('aria-label',`${D.metrics[key].label} travel network on a physical map of the selected states`);

  const collection={type:'FeatureCollection',features:selectedStateFeatures};
  const projection=d3.geoAlbersUsa().fitExtent([[36,26],[width-36,height-34]],collection);
  const geoPath=d3.geoPath(projection);

  const defs=svg.append('defs');
  defs.append('marker').attr('id','flow-arrow').attr('viewBox','0 -5 10 10').attr('refX',9).attr('refY',0)
    .attr('markerWidth',5.5).attr('markerHeight',5.5).attr('orient','auto')
    .append('path').attr('d','M0,-5L10,0L0,5').attr('fill','#52677e');

  defs.append('filter').attr('id','soft-shadow').html('<feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.16"/>');

  const featureByAbbr={};
  selectedStateFeatures.forEach(f=>{featureByAbbr[FIPS_TO_NODE[String(f.id).padStart(2,'0')]]=f});
  const centroids={};
  Object.entries(featureByAbbr).forEach(([abbr,f])=>{centroids[abbr]=geoPath.centroid(f)});

  const stateLayer=svg.append('g').attr('class','state-layer');
  stateLayer.selectAll('path').data(selectedStateFeatures).join('path')
    .attr('d',geoPath)
    .attr('class','state-shape')
    .attr('fill',f=>{
      const abbr=FIPS_TO_NODE[String(f.id).padStart(2,'0')];
      return key==='cluster'?clusterColors[D.clusters[abbr]]:'#dbeafe';
    })
    .attr('stroke',f=>{
      const abbr=FIPS_TO_NODE[String(f.id).padStart(2,'0')];
      return key==='cluster'?d3.color(clusterColors[D.clusters[abbr]]).darker(.7):'#7da7d9';
    })
    .append('title').text(f=>D.nodes.find(n=>n.id===FIPS_TO_NODE[String(f.id).padStart(2,'0')])?.name||'');

  const vmax=Math.max(...edges.map(e=>e.v),1),vmin=Math.min(...edges.map(e=>e.v),1);
  const widthScale=d3.scaleLinear().domain([Math.log1p(vmin),Math.log1p(vmax)]).range([1.0,7.0]);
  const edgeLayer=svg.append('g').attr('class','flow-layer');
  edgeLayer.selectAll('path').data(edges).join('path')
    .attr('class','flow-edge')
    .attr('d',(e,k)=>{
      const a=centroids[D.nodes[e.i].id],b=centroids[D.nodes[e.j].id];
      if(!a||!b)return '';
      return curvePath(a,b,k%2===0?.15:-.15);
    })
    .attr('stroke-width',e=>widthScale(Math.log1p(e.v)))
    .attr('marker-end','url(#flow-arrow)')
    .append('title').text(e=>`${D.nodes[e.i].name} → ${D.nodes[e.j].name}: ${fmtInt.format(e.v)} retained flow`);

  const labelLayer=svg.append('g').attr('class','label-layer');
  D.nodes.forEach(n=>{
    const c=centroids[n.id]; if(!c)return;
    const g=labelLayer.append('g').attr('transform',`translate(${c[0]},${c[1]})`);
    g.append('circle').attr('r',13).attr('class','state-anchor').attr('filter','url(#soft-shadow)');
    g.append('text').attr('class','state-abbr').attr('text-anchor','middle').attr('dy','.35em').text(n.id);
    g.append('title').text(n.name);
  });

  const legend=svg.append('g').attr('class','map-legend').attr('transform',`translate(${width-198},${height-76})`);
  legend.append('rect').attr('width',178).attr('height',54).attr('rx',10).attr('class','legend-box');
  legend.append('path').attr('d','M14,19 H64').attr('class','legend-flow').attr('marker-end','url(#flow-arrow)');
  legend.append('text').attr('x',76).attr('y',23).text('retained flow');
  legend.append('rect').attr('x',14).attr('y',34).attr('width',22).attr('height',12).attr('rx',2).attr('class','legend-state');
  legend.append('text').attr('x',46).attr('y',44).text(key==='cluster'?'bubble / state':'state area');

  document.getElementById('networkTitle').textContent=`${D.metrics[key].label} · ${networkMode.value==='daily'?D.dates[+dateSlider.value]:'30-day aggregate'}`;
}

Chart.defaults.font.family='Inter, system-ui, sans-serif';Chart.defaults.color='#5f6d80';
let selectedFlowChart=new Chart(document.getElementById('selectedFlowChart'),{type:'line',data:{labels:D.dates,datasets:[]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` Retained flow: ${fmtInt.format(c.raw)}`}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:7}},y:{grid:{color:'#edf1f6'},ticks:{callback:v=>fmtCompact.format(v)},title:{display:true,text:'Daily travel flow'}}}}});
let flowComparisonChart=new Chart(document.getElementById('flowComparisonChart'),{type:'line',data:{labels:D.dates,datasets:flowMethods.map(k=>({label:D.metrics[k].label,data:D.dailyTotals[k],borderColor:palette[k],backgroundColor:palette[k],pointRadius:0,borderWidth:2,tension:.15}))},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${fmtInt.format(c.raw)}`}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:8}},y:{grid:{color:'#edf1f6'},ticks:{callback:v=>fmtCompact.format(v)},title:{display:true,text:'Daily retained travel'}}}}});
const tradeKeys=['uniform','binary_edge','continuous_edge','binary_node','cluster'];
let tradeoffChart=new Chart(document.getElementById('tradeoffChart'),{type:'scatter',data:{datasets:tradeKeys.map(k=>({label:D.metrics[k].label,data:[{x:D.metrics[k].travelReduction,y:D.metrics[k].infectionReduction}],backgroundColor:k==='cluster'?'#9467bd':(palette[k]||'#64748b'),pointRadius:k==='cluster'?8:6,pointHoverRadius:9}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw.y.toFixed(2)}% infection reduction, ${c.raw.x.toFixed(2)}% travel removed`}}},scales:{x:{title:{display:true,text:'Travel removed (%)'},min:0,max:100,grid:{color:'#edf1f6'}},y:{title:{display:true,text:'Infection reduction (%)'},min:0,max:65,grid:{color:'#edf1f6'}}}}});

function updateMetrics(){const key=select.value,m=D.metrics[key];document.getElementById('newInfected').textContent=fmtInt.format(m.newInfected);document.getElementById('infectionReduction').textContent=m.infectionReduction.toFixed(2)+'%';document.getElementById('travelReduction').textContent=m.travelReduction.toFixed(2)+'%';document.getElementById('runtime').textContent=m.runtime.toFixed(2)+' s';document.getElementById('budgetLabel').textContent=key==='cluster'?'Not budget-matched':'20% reference budget';selectedFlowChart.data.datasets=[{label:m.label,data:D.dailyTotals[key],borderColor:palette[key],backgroundColor:palette[key],pointRadius:2,borderWidth:2.5,tension:.18,fill:false}];selectedFlowChart.update();document.getElementById('selectedSummary').innerHTML=`Average daily retained travel: <strong>${fmtCompact.format(m.avgDailyTravel)}</strong> · Period retained travel: <strong>${fmtCompact.format(m.periodTravel)}</strong>`;drawNetwork()}
function buildTable(){const tbody=document.getElementById('summaryTable');['baseline','uniform',...flowMethods].forEach(k=>{const m=D.metrics[k],tr=document.createElement('tr');tr.innerHTML=`<td><strong>${m.label}</strong></td><td>${fmtInt.format(m.newInfected)}</td><td>${m.infectionReduction.toFixed(2)}%</td><td>${m.travelReduction.toFixed(2)}%</td><td>${m.runtime.toFixed(2)} s</td>`;tbody.appendChild(tr)})}

select.addEventListener('change',updateMetrics);
networkMode.addEventListener('change',()=>{dateControl.classList.toggle('disabled',networkMode.value!=='daily');drawNetwork()});
dateSlider.addEventListener('input',()=>{dateLabel.textContent=D.dates[+dateSlider.value];drawNetwork()});
edgeSlider.addEventListener('input',()=>{edgeLabel.textContent=edgeSlider.value;drawNetwork()});
window.addEventListener('resize',()=>{if(mapReady)drawNetwork()});

buildTable();
updateMetrics();
loadPhysicalMap();
