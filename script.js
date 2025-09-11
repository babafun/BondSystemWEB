async function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

// Initialize sentiment pipeline from transformers.js
let sentimentPipeline;
async function loadPipeline() {
  sentimentPipeline = await transformers.pipelines("sentiment-analysis", "Xenova/distilbert-base-uncased-finetuned-sst-2-english");
}
loadPipeline();

async function estimateBond() {
  const essay = document.getElementById("estimatorInput").value.trim();
  const output = document.getElementById("estimatorOutput");

  if (!essay) {
    output.textContent = "⚠️ Please write something first!";
    return;
  }

  if (!sentimentPipeline) {
    output.textContent = "Loading AI model... please wait a few seconds and try again.";
    return;
  }

  // Run sentiment analysis
  const results = await sentimentPipeline(essay);
  const sentiment = results[0]; // label: POSITIVE/NEGATIVE, score: 0-1

  // Map sentiment to bond scale
  let bond = 0;
  if (sentiment.label === "POSITIVE") bond = Math.round(sentiment.score * 10); // 0-10
  else bond = Math.round(-sentiment.score * 5); // -5 to 0

  output.innerHTML = `🤖 Estimated Bond: <b>${bond}</b> (sentiment: ${sentiment.label}, score: ${sentiment.score.toFixed(2)})`;
}

function predictBond() {
  const bond = parseFloat(document.getElementById("bondLevel").value);
  const essay = document.getElementById("predictionInput").value.trim();
  const output = document.getElementById("predictionOutput");

  if (isNaN(bond) || bond < -5 || bond > 10 || !essay) {
    output.textContent = "⚠️ Enter a valid bond (-5 to 10) and write something.";
    return;
  }

  // Simple mock trend based on bond value
  let trend;
  if (bond < 0) trend = "⚠️ Might worsen unless major change happens.";
  else if (bond < 4) trend = "🙂 Could slowly improve, fragile friendship.";
  else if (bond < 7) trend = "💛 Stable friendship, likely growth.";
  else trend = "🔥 Intense bond, very close connection.";

  output.innerHTML = `🤖 Predicted Future: ${trend}`;
}
