const $ = id => document.getElementById(id);
let currentPractice = null;
const extraFields = {
  limit: [['point','x tiende a…','2']],
  evaluate: [['point','Valor de x','3']],
  definite: [['lower','Límite inferior','0'],['upper','Límite superior','1']],
  compose: [['second_expression','Segunda función g(x)','x+1']]
};
function updateFields(){
  const mode=$('mode').value;
  $('extraFields').innerHTML=(extraFields[mode]||[]).map(([id,label,placeholder])=>`<label for="${id}">${label}</label><input id="${id}" placeholder="${placeholder}" value="${placeholder}">`).join('');
}
$('mode').addEventListener('change',updateFields);updateFields();
document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b===btn));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('hidden',p.id!==btn.dataset.tab));
}));
document.querySelectorAll('.chip').forEach(btn=>btn.addEventListener('click',()=>{
  $('expression').value=btn.dataset.expression;$('mode').value=btn.dataset.mode;updateFields();
  if(btn.dataset.point && $('point')) $('point').value=btn.dataset.point;
  document.querySelector('[data-tab="solver"]').click();
}));
$('solveBtn').addEventListener('click',async()=>{
  $('error').textContent='';$('result').classList.add('hidden');
  const payload={mode:$('mode').value,expression:$('expression').value};
  (extraFields[payload.mode]||[]).forEach(([id])=>{if($(id))payload[id]=$(id).value});
  $('solveBtn').disabled=true;$('solveBtn').textContent='Resolviendo…';
  try{
    const res=await fetch('/api/solve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'No se pudo resolver.');
    $('answer').textContent=data.answer_text||data.answer;
    $('answerText').textContent=data.answer_latex?'Resultado simbólico exacto cuando aplica.':'';
    $('steps').innerHTML='';data.steps.forEach(s=>{const li=document.createElement('li');li.textContent=s;$('steps').appendChild(li)});
    $('criticalDetails').innerHTML='';
    if(data.critical_points){data.critical_points.forEach(p=>{const d=document.createElement('div');d.className='critical-item';d.textContent=`(${p.x}, ${p.y}) — ${p.classification}`;$('criticalDetails').appendChild(d)})}
    $('result').classList.remove('hidden');
  }catch(e){$('error').textContent=e.message}
  finally{$('solveBtn').disabled=false;$('solveBtn').innerHTML='Resolver ejercicio <span>→</span>'}
});
$('graphBtn').addEventListener('click',async()=>{
  $('graphError').textContent='';
  try{
    const payload={mode:'simplify',expression:$('graphExpr').value};
    const res=await fetch('/api/solve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'Función no válida.');
    // Parse safe function syntax in the browser only after server validation.
    

const expr = $('graphExpr').value
  .replace(/^\s*f\s*\(\s*x\s*\)\s*=\s*/i, '')
  .replace(/(\d)(x)/g, '$1*$2')
  .replace(/\s/g, '');

const xminText = $('xmin').value.trim();
const xmaxText = $('xmax').value.trim();
let xmin = xminText === '' ? -10 : Number(xminText);
let xmax = xmaxText === '' ? 10 : Number(xmaxText);

if (!Number.isFinite(xmin) || !Number.isFinite(xmax) || xmin >= xmax) {
  throw new Error('Revisa el intervalo: X mínimo debe ser menor que X máximo.');
}

const xs = [];
const ys = [];

for (let i = 0; i <= 400; i++) {
  const xv = xmin + (xmax - xmin) * i / 400;
  xs.push(xv);

  try {
    const yv = mathEval(expr, xv);
    ys.push(Number.isFinite(yv) && Math.abs(yv) < 1e7 ? yv : null);
  } catch (e) {
    ys.push(null);
  }
}

// Detectar máximos y mínimos aproximados mediante cambios de pendiente.
const maximaX = [];
const maximaY = [];
const minimaX = [];
const minimaY = [];

const raicesX = [];
const raicesY = [];

function encontrarRaices() {
  const cantidad = 1000;
  const paso = (xmax - xmin) / cantidad;

  for (let i = 0; i < cantidad; i++) {
    let a = xmin + i * paso;
    let b = a + paso;

    try {
      let fa = mathEval(expr, a);
      let fb = mathEval(expr, b);

      if (!Number.isFinite(fa) || !Number.isFinite(fb)) continue;

      // Si la función pasa por cero exactamente.
      if (Math.abs(fa) < 1e-8) {
        if (!raicesX.some(r => Math.abs(r - a) < paso)) {
          raicesX.push(a);
          raicesY.push(0);
        }
        continue;
      }

      // Buscar un cambio de signo.
      if (fa * fb > 0) continue;

      // Refinar la raíz mediante bisección.
      for (let j = 0; j < 45; j++) {
        const medio = (a + b) / 2;
        const fm = mathEval(expr, medio);

        if (Math.abs(fm) < 1e-10) {
          a = medio;
          b = medio;
          break;
        }

        if (fa * fm <= 0) {
          b = medio;
          fb = fm;
        } else {
          a = medio;
          fa = fm;
        }
      }

      const raiz = (a + b) / 2;

      if (!raicesX.some(r => Math.abs(r - raiz) < paso)) {
        raicesX.push(raiz);
        raicesY.push(0);
      }
    } catch (e) {
      // Ignorar puntos donde la función no esté definida.
    }
  }
}

encontrarRaices();


function pendiente(x) {
  const h = 0.0001 * Math.max(1, Math.abs(x));
  return (mathEval(expr, x + h) - mathEval(expr, x - h)) / (2 * h);
}

for (let i = 1; i < 1000; i++) {
  const x1 = xmin + (xmax - xmin) * (i - 1) / 1000;
  const x2 = xmin + (xmax - xmin) * i / 1000;

  try {
    const p1 = pendiente(x1);
    const p2 = pendiente(x2);

    if (!Number.isFinite(p1) || !Number.isFinite(p2)) continue;
    if (p1 * p2 >= 0) continue;

    const xc = (x1 + x2) / 2;
    const yc = mathEval(expr, xc);

    if (!Number.isFinite(yc)) continue;

    if (p1 > 0 && p2 < 0) {
      maximaX.push(xc);
      maximaY.push(yc);
    } else if (p1 < 0 && p2 > 0) {
      minimaX.push(xc);
      minimaY.push(yc);
    }
  } catch (e) {
    // Ignorar puntos donde la función no esté definida.
  }
}

const traces = [
  {
    x: xs,
    y: ys,
    type: 'scatter',
    mode: 'lines',
    connectgaps: false,
    line: { color: '#8ba5ff', width: 3 },
    name: 'f(x)'
  }
];

if (maximaX.length) {
  traces.push({
    x: maximaX,
    y: maximaY,
    type: 'scatter',
    mode: 'markers',
    marker: { color: '#ff9f43', size: 11 },
    name: 'Máximos locales',
    hovertemplate: 'Máximo<br>x=%{x:.3f}<br>y=%{y:.3f}<extra></extra>'
  });
}

if (minimaX.length) {
  traces.push({
    x: minimaX,
    y: minimaY,
    type: 'scatter',
    mode: 'markers',
    marker: { color: '#48d597', size: 11 },
    name: 'Mínimos locales',
    hovertemplate: 'Mínimo<br>x=%{x:.3f}<br>y=%{y:.3f}<extra></extra>'
  });
}

if (raicesX.length) {
  traces.push({
    x: raicesX,
    y: raicesY,
    type: 'scatter',
    mode: 'markers',
    marker: {
      color: '#ff5c7a',
      size: 10,
      symbol: 'diamond'
    },
    name: 'Intersecciones con X',
    hovertemplate:
      'Intersección con X<br>x = %{x:.4f}<br>y = 0<extra></extra>'
  });
}

Plotly.newPlot('plot', traces, {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { color: '#c8d4e8' },
  margin: { l: 48, r: 20, t: 35, b: 45 },
  xaxis: {
    title: 'x',
    gridcolor: '#293750',
    zerolinecolor: '#7a8aaa'
  },
  yaxis: {
    title: 'f(x)',
    gridcolor: '#293750',
    zerolinecolor: '#7a8aaa'
  },
  legend: { orientation: 'h', y: 1.12 },
  showlegend: true
}, {
  responsive: true,
  displaylogo: false
});

// Quitar el procedimiento de la gráfica anterior para evitar duplicados.
const previousExplanation = document.getElementById('graphExplanation');
if (previousExplanation) previousExplanation.remove();

const explanation = document.createElement('section');
explanation.id = 'graphExplanation';

explanation.style.cssText =
  'margin-top:24px;padding:20px;border:1px solid #293750;' +
  'border-radius:14px;color:#c8d4e8;line-height:1.8;';

const derivative = window.math.derivative(expr, 'x').toString();

const criticalValues = maximaX
  .map((x, i) => ({
    type: 'Máximo local',
    x,
    y: maximaY[i]
  }))
  .concat(
    minimaX.map((x, i) => ({
      type: 'Mínimo local',
      x,
      y: minimaY[i]
    }))
  );

explanation.innerHTML = '';

const title = document.createElement('h3');
title.textContent = 'Derivada y procedimiento';
explanation.appendChild(title);

const original = document.createElement('p');
original.textContent = '1. Función original: f(x) = ' + expr;
explanation.appendChild(original);

const derivativeLine = document.createElement('p');
derivativeLine.textContent = '2. Derivada: f′(x) = ' + derivative;
explanation.appendChild(derivativeLine);

const criticalLine = document.createElement('p');
criticalLine.textContent =
  '3. Se iguala la derivada a cero para encontrar los puntos críticos.';
explanation.appendChild(criticalLine);

criticalValues.forEach(point => {
  const line = document.createElement('p');
  line.textContent =
    point.type + ': (' + point.x.toFixed(3) +
    ', ' + point.y.toFixed(3) + ')';
  explanation.appendChild(line);
});

const rootsLine = document.createElement('p');
rootsLine.textContent = raicesX.length
  ? '4. Intersecciones con el eje X: ' +
    raicesX.map(x => '(' + x.toFixed(4) + ', 0)').join('; ')
  : '4. No se detectaron intersecciones con el eje X en el intervalo.';
explanation.appendChild(rootsLine);

document.getElementById('plot').insertAdjacentElement(
  'afterend',
  explanation
);


  }catch(e){$('graphError').textContent=e.message}
});
// Small expression evaluator for graphing; no eval() or Function().
function mathEval(expr,x){
  // Use math.js from CDN for safe mathematical parsing.
  if(!window.math) throw new Error('No se cargó la biblioteca de gráficas. Revisa tu conexión.');
  return window.math.evaluate(expr,{x});
}
async function loadPractice(){
  $('feedback').textContent='';$('practiceAnswer').value='';
  try{const r=await fetch('/api/practice');currentPractice=await r.json();$('practiceQuestion').textContent=currentPractice.question}
  catch{$('practiceQuestion').textContent='No se pudo cargar el ejercicio.'}
}
$('nextPractice').addEventListener('click',loadPractice);
$('checkBtn').addEventListener('click',async()=>{
  if(!currentPractice)return;
  try{
    const r=await fetch('/api/practice/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:currentPractice.question,answer:$('practiceAnswer').value})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||'Error al comprobar.');
    $('feedback').textContent=d.feedback+' Pista: '+d.hint+(d.expected?' Respuesta esperada: '+d.expected:'');
  }catch(e){$('feedback').textContent=e.message}
});
// El panel de datos del equipo ya no existe en el HTML.
// No registrar listeners sobre elementos inexistentes.
loadPractice();


// Calculadora MaEva: usa Math.js (sin eval ni Function).
(function initCalculator() {
  const expressionEl = $('calcExpression');
  const resultEl = $('calcResult');
  const errorEl = $('calcError');
  if (!expressionEl || !resultEl) return;

  let expression = '';
  let lastAnswer = '0';

  function render() {
    expressionEl.textContent = expression || '0';
    try {
      if (!expression) {
        resultEl.textContent = '0';
        errorEl.textContent = '';
        return;
      }
      if (!window.math) throw new Error('No se cargó Math.js. Revisa tu conexión a Internet y recarga la página.');
      const value = window.math.evaluate(expression);
      resultEl.textContent =
        typeof value === 'number' && Number.isFinite(value)
          ? Number(value.toPrecision(12)).toLocaleString('en-US', { maximumFractionDigits: 10 })
          : String(value);
      errorEl.textContent = '';
    } catch (_) {
      resultEl.textContent = '…';
      errorEl.textContent = '';
    }
  }

  function calculate() {
    if (!expression.trim()) return;
    try {
      if (!window.math) throw new Error('No se cargó Math.js. Revisa tu conexión a Internet y recarga la página.');
      const value = window.math.evaluate(expression);
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error('El resultado no es un número real finito.');
      }
      lastAnswer = String(Number(value.toPrecision(12)));
      expression = lastAnswer;
      resultEl.textContent = Number(lastAnswer).toLocaleString('en-US', { maximumFractionDigits: 10 });
      expressionEl.textContent = 'Resultado';
      errorEl.textContent = '';
    } catch (e) {
      errorEl.textContent = 'Revisa la operación. ' + (e.message || '');
    }
  }

  document.querySelectorAll('.calc-key').forEach(button => {
    button.addEventListener('click', () => {
      errorEl.textContent = '';
      const action = button.dataset.calc;
      const value = button.dataset.value;

      if (action === 'clear') {
        expression = '';
        resultEl.textContent = '0';
        render();
        return;
      }
      if (action === 'backspace') {
        expression = expression.slice(0, -1);
        render();
        return;
      }
      if (action === 'equals') {
        calculate();
        return;
      }
      if (action === 'percent') {
        const match = expression.match(/(\d*\.?\d+)$/);
        if (match) {
          const start = match.index;
          expression = expression.slice(0, start) + '(' + match[0] + '/100)';
        } else if (expression) {
          expression = '(' + expression + ')/100';
        }
        render();
        return;
      }
      if (action === 'sign') {
        if (!expression) expression = '-';
        else if (/^-?\d*\.?\d+$/.test(expression)) {
          expression = expression.startsWith('-') ? expression.slice(1) : '-' + expression;
        } else {
          expression = '-1*(' + expression + ')';
        }
        render();
        return;
      }
      if (action === 'sqrt') {
        expression = expression ? 'sqrt(' + expression + ')' : 'sqrt(';
        render();
        return;
      }
      if (action === 'ans') {
        expression += lastAnswer;
        render();
        return;
      }
      if (value !== undefined) {
        expression += value;
        render();
      }
    });
  });

  document.addEventListener('keydown', event => {
    const calculatorPanel = $('calculator');
    if (!calculatorPanel || calculatorPanel.classList.contains('hidden')) return;
    if (/^[0-9.+\-*/()%()]$/.test(event.key)) {
      expression += event.key;
      render();
    } else if (event.key === '^') {
      expression += '^';
      render();
    } else if (event.key === 'Enter' || event.key === '=') {
      event.preventDefault();
      calculate();
    } else if (event.key === 'Backspace') {
      expression = expression.slice(0, -1);
      render();
    } else if (event.key === 'Escape') {
      expression = '';
      render();
    }
  });
})();
