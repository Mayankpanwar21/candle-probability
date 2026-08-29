const $=id=>document.getElementById(id);
const fileInput=$('csvFile'), assetInput=$('asset'), tfInput=$('timeframe'), importBtn=$('importBtn');
let selectedFile=null, parsedCandles=[];

const aliases={open:['open','o','<open>'],high:['high','h','<high>'],low:['low','l','<low>'],close:['close','c','<close>'],date:['date','<date>','datetime','timestamp','time']};
function normalize(s){return String(s??'').trim().toLowerCase().replace(/^['"]|['"]$/g,'').replace(/\s+/g,'').replace(/_/g,'');}
function detect(headers,type){const wanted=aliases[type];return headers.findIndex(h=>wanted.includes(normalize(h))||normalize(h).includes(type));}
function splitLine(line,delimiter){return line.split(delimiter).map(x=>x.trim().replace(/^['"]|['"]$/g,''));}
function parseCSV(text){
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
  if(lines.length<2) throw new Error('The file does not contain enough rows.');
  const delimiter=(lines[0].includes('\t')?'\t':lines[0].includes(';')?';':',');
  const headers=splitLine(lines[0],delimiter);
  const idx={open:detect(headers,'open'),high:detect(headers,'high'),low:detect(headers,'low'),close:detect(headers,'close'),date:detect(headers,'date')};
  for(const k of ['open','high','low','close']) if(idx[k]<0) throw new Error(`Could not find ${k.toUpperCase()} column.`);
  const candles=[];
  for(let i=1;i<lines.length;i++){
    const row=splitLine(lines[i],delimiter);
    const nums=['open','high','low','close'].map(k=>Number(row[idx[k]]));
    if(nums.every(Number.isFinite)) candles.push({index:i,date:idx.date>=0?(row[idx.date]||''): '',open:nums[0],high:nums[1],low:nums[2],close:nums[3]});
  }
  if(!candles.length) throw new Error('No valid OHLC rows were found.');
  return candles;
}
fileInput.addEventListener('change',async()=>{
  selectedFile=fileInput.files[0]; importBtn.disabled=true; parsedCandles=[];
  if(!selectedFile){$('fileStatus').textContent='No file selected';return}
  try{parsedCandles=parseCSV(await selectedFile.text());$('fileStatus').className='status good';$('fileStatus').textContent=`✓ ${parsedCandles.length.toLocaleString()} candles detected • OHLC ready`;importBtn.disabled=false}
  catch(e){$('fileStatus').className='status bad';$('fileStatus').textContent=e.message}
});
function getDatasets(){try{return JSON.parse(localStorage.getItem('candleProbabilityDatasets')||'[]')}catch{return[]}}
function saveDataset(ds){const all=getDatasets();all.push(ds);localStorage.setItem('candleProbabilityDatasets',JSON.stringify(all))}
importBtn.addEventListener('click',()=>{
  if(!parsedCandles.length)return;
  const ds={id:crypto.randomUUID(),asset:assetInput.value.trim()||'Unknown',timeframe:tfInput.value.trim()||'Unknown',filename:selectedFile.name,candleCount:parsedCandles.length,importedAt:new Date().toISOString(),candles:parsedCandles};
  saveDataset(ds);renderDatasets();
  $('fileStatus').className='status good';$('fileStatus').textContent=`✓ Imported ${parsedCandles.length.toLocaleString()} candles`;
  fileInput.value='';selectedFile=null;parsedCandles=[];importBtn.disabled=true;
});
function renderDatasets(){const all=getDatasets();$('datasetCount').textContent=all.length;const box=$('datasets');if(!all.length){box.className='empty';box.textContent='No datasets imported yet.';return}box.className='';box.innerHTML=all.slice().reverse().map(d=>`<div class="dataset"><div><strong>${escapeHtml(d.asset)} • ${escapeHtml(d.timeframe)}</strong><small>${d.candleCount.toLocaleString()} candles • ${escapeHtml(d.filename)}</small></div><span class="badge">Stored</span></div>`).join('')}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
renderDatasets();
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
