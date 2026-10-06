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

function matrixFor(key){if(networkMode.value==='daily')return D.flows[key][+dateSlider.value];return D.aggregate[key]}
function topEdges(matrix,n){const e=[];for(let i=0;i<matrix.length;i++)for(let j=0;j<matrix[i].length;j++)if(i!==j&&matrix[i][j]>0)e.push({i,j,v:matrix[i][j]});return e.sort((a,b)=>b.v-a.v).slice(0,n)}

const cy=cytoscape({container:document.getElementById('network'),layout:{name:'preset'},userZoomingEnabled:true,userPanningEnabled:true,wheelSensitivity:.15,style:[
{selector:'node',style:{'background-color':'#348dcc','label':'data(label)','font-size':12,'font-weight':600,'color':'#142033','text-valign':'bottom','text-margin-y':8,'width':42,'height':42,'border-width':2,'border-color':'#fff','overlay-opacity':0}},
{selector:'edge',style:{'curve-style':'bezier','target-arrow-shape':'triangle','target-arrow-color':'#67768a','line-color':'#67768a','opacity':.55,'arrow-scale':.75,'width':'mapData(weight, 0, 1, 1, 8)'}},
{selector:'.cluster0',style:{'background-color':clusterColors[0]}},{selector:'.cluster1',style:{'background-color':clusterColors[1]}},{selector:'.cluster2',style:{'background-color':clusterColors[2]}}
]});

function drawNetwork(){const key=select.value,m=matrixFor(key),edges=topEdges(m,+edgeSlider.value);const vmax=Math.max(...edges.map(e=>e.v),1),vmin=Math.min(...edges.map(e=>e.v),0);const els=[];D.nodes.forEach(n=>els.push({group:'nodes',data:{id:n.id,label:n.name},position:{x:n.x*7.7,y:n.y*5.2},classes:key==='cluster'?`cluster${D.clusters[n.id]}`:''}));edges.forEach((e,k)=>els.push({group:'edges',data:{id:`e${k}`,source:D.nodes[e.i].id,target:D.nodes[e.j].id,flow:e.v,weight:(Math.log1p(e.v)-Math.log1p(vmin))/(Math.log1p(vmax)-Math.log1p(vmin)+1e-9)}}));cy.elements().remove();cy.add(els);cy.fit(undefined,35);document.getElementById('networkTitle').textContent=`${D.metrics[key].label} · ${networkMode.value==='daily'?D.dates[+dateSlider.value]:'30-day aggregate'}`}

Chart.defaults.font.family='Inter, system-ui, sans-serif';Chart.defaults.color='#5f6d80';
let selectedFlowChart=new Chart(document.getElementById('selectedFlowChart'),{type:'line',data:{labels:D.dates,datasets:[]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` Retained flow: ${fmtInt.format(c.raw)}`}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:7}},y:{grid:{color:'#edf1f6'},ticks:{callback:v=>fmtCompact.format(v)},title:{display:true,text:'Daily travel flow'}}}}});
let flowComparisonChart=new Chart(document.getElementById('flowComparisonChart'),{type:'line',data:{labels:D.dates,datasets:flowMethods.map(k=>({label:D.metrics[k].label,data:D.dailyTotals[k],borderColor:palette[k],backgroundColor:palette[k],pointRadius:0,borderWidth:2,tension:.15}))},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${fmtInt.format(c.raw)}`}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:8}},y:{grid:{color:'#edf1f6'},ticks:{callback:v=>fmtCompact.format(v)},title:{display:true,text:'Daily retained travel'}}}}});
const tradeKeys=['uniform','binary_edge','continuous_edge','binary_node','cluster'];
let tradeoffChart=new Chart(document.getElementById('tradeoffChart'),{type:'scatter',data:{datasets:tradeKeys.map(k=>({label:D.metrics[k].label,data:[{x:D.metrics[k].travelReduction,y:D.metrics[k].infectionReduction}],backgroundColor:k==='cluster'?'#9467bd':(palette[k]||'#64748b'),pointRadius:k==='cluster'?8:6,pointHoverRadius:9}))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw.y.toFixed(2)}% infection reduction, ${c.raw.x.toFixed(2)}% travel removed`}}},scales:{x:{title:{display:true,text:'Travel removed (%)'},min:0,max:100,grid:{color:'#edf1f6'}},y:{title:{display:true,text:'Infection reduction (%)'},min:0,max:65,grid:{color:'#edf1f6'}}}}});

function updateMetrics(){const key=select.value,m=D.metrics[key];document.getElementById('newInfected').textContent=fmtInt.format(m.newInfected);document.getElementById('infectionReduction').textContent=m.infectionReduction.toFixed(2)+'%';document.getElementById('travelReduction').textContent=m.travelReduction.toFixed(2)+'%';document.getElementById('runtime').textContent=m.runtime.toFixed(2)+' s';document.getElementById('budgetLabel').textContent=key==='cluster'?'Not budget-matched':'20% reference budget';selectedFlowChart.data.datasets=[{label:m.label,data:D.dailyTotals[key],borderColor:palette[key],backgroundColor:palette[key],pointRadius:2,borderWidth:2.5,tension:.18,fill:false}];selectedFlowChart.update();document.getElementById('selectedSummary').innerHTML=`Average daily retained travel: <strong>${fmtCompact.format(m.avgDailyTravel)}</strong> · Period retained travel: <strong>${fmtCompact.format(m.periodTravel)}</strong>`;drawNetwork()}

function buildTable(){const tbody=document.getElementById('summaryTable');['baseline','uniform',...flowMethods].forEach(k=>{const m=D.metrics[k],tr=document.createElement('tr');tr.innerHTML=`<td><strong>${m.label}</strong></td><td>${fmtInt.format(m.newInfected)}</td><td>${m.infectionReduction.toFixed(2)}%</td><td>${m.travelReduction.toFixed(2)}%</td><td>${m.runtime.toFixed(2)} s</td>`;tbody.appendChild(tr)})}

select.addEventListener('change',updateMetrics);networkMode.addEventListener('change',()=>{dateControl.classList.toggle('disabled',networkMode.value!=='daily');drawNetwork()});dateSlider.addEventListener('input',()=>{dateLabel.textContent=D.dates[+dateSlider.value];drawNetwork()});edgeSlider.addEventListener('input',()=>{edgeLabel.textContent=edgeSlider.value;drawNetwork()});
buildTable();updateMetrics();
