import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const $ = (q) => document.querySelector(q);
const log = $('#log');
const status = $('#status');
const bar = $('#bar');
const progress = $('#progress');
const modelSel = $('#model');
const gpuName = $('#gpuName');

let engine = null;
let currentModel = null;
let chat = [
  {
    role: 'system',
    content: `You are Bond Insight, an assistant that reasons with the Bond System created by Lightning2580.\n\nRules you always follow succinctly:\n- Scale: -5 to 10 in standardised unit 'o'. 0 is neutral (^_^). Negatives mean dislike; positives mean increasing affinity up to 'Utter Psychological Requirement'.\n- Meanings: -5 Utter Loathing, -4 Hatred, -3 Strong Dislike, -2 Annoyance, -1 Mild Dislike, 0 (^_^), 1 Affable, 2 Friends, 3 Best Friends, 4 Love, 5 Extreme Love, 6 Obsessive Infatuation, 7 Extreme Obsessive Infatuation, 8 They're all you can focus on, 9 Psychological Dependence, 10 Utter Psychological Requirement.\n- Important: 1–3 are friendships, 4+ indicates romance/attachment beyond friendship. Do not call 7+ "friends".\n- Include the Loneliness/Simpery scale 'L1..L10' when relevant.\n- The relationship measure is two-way; call out asymmetry if the user's A→B score differs from B→A.\n- Use short, clear steps. If you’re unsure, ask for the missing inputs explicitly.\n- Be age-appropriate and respectful.\n- Output a final line: 'Result: <score o> [optional Lx]'.`
  }
];

function add(role, text) {
  const el = document.createElement('div');
  el.className = 'msg ' + (role === 'user' ? 'me' : 'ai');
  el.innerHTML = `<div class="role ${role === 'user' ? 'me' : 'ai'}">${role === 'user' ? 'U' : 'AI'}</div><div class="content"></div>`;
  el.querySelector('.content').textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

async function ensureEngine(selected) {
  if (engine && currentModel === selected) return;
  if (engine) {
    try {
      await engine.unload();
    } catch (e) {}
  }
  status.textContent = 'Loading model… (first run downloads + caches it)';
  progress.style.display = 'block';
  bar.style.width = '0%';
  const cfg = {
    initProgressCallback: (info) => {
      const { progress: p, text } = info;
      if (p !== undefined) {
        bar.style.width = Math.round(p * 100) + '%';
      }
      status.textContent = text ?? 'Loading…';
    }
  };
  engine = await webllm.CreateMLCEngine(selected, cfg);
  currentModel = selected;
  progress.style.display = 'none';
  status.textContent = 'Loaded ' + selected;
  try {
    const dev = await engine.getGPUDevice();
    gpuName.textContent = dev?.adapter?.name ?? 'Unknown';
  } catch {
    gpuName.textContent = 'Unknown';
  }
}

async function ask() {
  const text = $('#user').value.trim();
  if (!text) return;
  $('#user').value = '';
  add('user', text);
  status.textContent = 'Thinking…';
  const selected = modelSel.value;
  await ensureEngine(selected);

  const messages = [...chat, { role: 'user', content: text }];
  let reply = '';
  const stream = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: 0.6,
    max_tokens: 512,
  });
  add('assistant', '');
  const last = log.lastElementChild.querySelector('.content');
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content ?? '';
    reply += delta;
    last.textContent = reply;
    log.scrollTop = log.scrollHeight;
  }
  chat.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
  status.textContent = 'Ready.';
}

$('#send').addEventListener('click', ask);
$('#user').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    ask();
  }
});

ensureEngine(modelSel.value).catch(err => {
  status.textContent = 'Error: ' + err?.message;
});
