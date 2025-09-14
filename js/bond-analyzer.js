import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const paragraphEl = document.getElementById('paragraph');
const analyzeBtn = document.getElementById('analyze');
const resultCard = document.getElementById('result-card');
const scoreOEl = document.getElementById('score_o');
const LValEl = document.getElementById('L_val');
const typePEl = document.getElementById('type_p');
const asymmetryEl = document.getElementById('asymmetry');
const highlightsEl = document.getElementById('highlights');
const rawDataEl = document.getElementById('raw_data');
const scoreBar = document.getElementById('score_bar');
const LBar = document.getElementById('L_bar');
const typeBar = document.getElementById('type_bar');

let engine = null;

async function ensureEngine() {
  if (engine) return;
  engine = await webllm.CreateMLCEngine("Qwen2.5-0.5B-Instruct-q4f16_1-MLC", {
    initProgressCallback: (info) => console.log(info)
  });
}

analyzeBtn.addEventListener('click', async () => {
  const paragraph = paragraphEl.value.trim();
  if (!paragraph) return;

  await ensureEngine();

  resultCard.style.display = 'block';
  scoreOEl.textContent = '…';
  LValEl.textContent = '…';
  typePEl.textContent = '…';
  asymmetryEl.textContent = '…';
  highlightsEl.innerHTML = '';
  rawDataEl.textContent = '…';
  scoreBar.style.width = '0%';
  LBar.style.width = '0%';
  typeBar.style.width = '0%';

  const systemPrompt = `
You are Bond Insight. The user provides a paragraph describing Person B from Person A's perspective.
Estimate the following:
- score_o (-5 to 10, standardised units)
- L (1 to 10, simpery/loneliness)
- type_p (platonic value, real number 0 to 1)
- asymmetry_note (if Person B's feelings differ significantly)
- highlights (key phrases influencing score)

Respond with JSON only, keys: score_o, L, type_p, asymmetry_note, highlights
  `;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: paragraph }
  ];

  let resultJSON = '';
  try {
    const stream = await engine.chat.completions.create({ messages, stream: true, temperature: 0.6, max_tokens: 512 });
    for await (const chunk of stream) {
      resultJSON += chunk.choices?.[0]?.delta?.content ?? '';
    }
    const data = JSON.parse(resultJSON);

    // Update UI
    scoreOEl.textContent = data.score_o;
    LValEl.textContent = data.L;
    typePEl.textContent = data.type_p;
    asymmetryEl.textContent = data.asymmetry_note;
    highlightsEl.innerHTML = '';
    data.highlights?.forEach(h => {
      const span = document.createElement('span');
      span.className = 'highlight';
      span.textContent = h;
      highlightsEl.appendChild(span);
    });
    rawDataEl.textContent = JSON.stringify(data, null, 2);

    // Animate bars
    scoreBar.style.width = `${Math.min(Math.max((data.score_o + 5) / 15 * 100, 0), 100)}%`;
    LBar.style.width = `${Math.min(Math.max(data.L / 10 * 100, 0), 100)}%`;
    typeBar.style.width = `${Math.min(Math.max(data.type_p * 100, 0), 100)}%`;

  } catch (err) {
    console.error(err);
    rawDataEl.textContent = 'Error parsing AI response: ' + err.message;
  }
});
