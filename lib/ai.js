// Shared brain: used by server.js (Render) and netlify/functions/ai.js (Netlify)
const MODEL = process.env.MODEL || 'claude-sonnet-5';

const RULES = `You are BlockForge, an expert Roblox builder. You turn reference photos into block-style (Roblox Part) models.
Coordinates: integers in studs. x = right, y = up, z = toward the viewer (the front of the model faces +z). The model sits on y=0 and starts at x=0,z=0.
A box is [x,y,z,w,h,d,"#RRGGBB",material,pattern]. (x,y,z) is the MIN corner, w,h,d are sizes (>=1).
material: Plastic,SmoothPlastic,Wood,WoodPlanks,Brick,Concrete,Metal,Neon,Grass,Fabric,Slate,Ice,Glass.
pattern (texture look): none,noise,stripes,checker,bricks,grain. Use patterns where the real object has texture (wood grain, bricks, fabric weave, fur noise).
Method: 1) identify the object and its parts; 2) decide proportions in studs; 3) build every part. Use the colours from the photo (a measured palette is provided).
Merge voxels into few boxes (max 300). Add small detail boxes (eyes, buttons, trim, logos).
HIDDEN SIDES: the photo shows one side only. Infer back, left, right and top from symmetry, design logic and any extra photos, and build them fully. Never leave the model flat or hollow.
Reply with ONLY JSON, no markdown, keys in this order:
{"plan":"short part-by-part plan with proportions","name":"...","notes":"one line","views":{"back":"...","left":"...","right":"...","top":"..."},"boxes":[[...],...]}`;

function parse(text) {
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s < 0) throw new Error('AI returned no JSON');
  try { return JSON.parse(text.slice(s, e + 1)); } catch (_) {}
  // output was cut off: keep every complete box and close the JSON
  const i = text.lastIndexOf('],');
  if (i > s) { try { return JSON.parse(text.slice(s, i + 1) + ']}'); } catch (_) {} }
  throw new Error('AI returned broken JSON. Try again or lower the size.');
}

async function claude(content, maxTokens = 16000) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Missing ANTHROPIC_API_KEY environment variable on the server.');
  const r = await fetch(process.env.ANTHROPIC_URL || 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system: RULES, messages: [{ role: 'user', content }] })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message || 'Anthropic API error ' + r.status);
  return parse((j.content || []).filter(b => b.type === 'text').map(b => b.text).join(''));
}

const img = (d) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: d.replace(/^data:image\/\w+;base64,/, '') } });

async function run(body) {
  const { mode, images = [], render, model, style = 'auto', size = 24, palette = [] } = body;
  if (!images.length) throw new Error('Upload at least one photo.');
  if (mode === 'build') {
    return claude([
      ...images.map(img),
      { type: 'text', text: `Photo 1 is the main reference; any others are extra angles. Type: ${style}. Fit the model inside about ${size} studs on its longest side. Measured colours from the photo, most common first: ${palette.join(' ') || 'n/a'}. Build it.` }
    ]);
  }
  if (mode === 'refine') {
    return claude([
      { type: 'text', text: 'ORIGINAL REFERENCE PHOTO(S):' }, ...images.slice(0, 2).map(img),
      { type: 'text', text: 'YOUR CURRENT MODEL rendered from front, right, back, left (2x2 grid, top-left = front):' }, img(render),
      { type: 'text', text: 'Current model JSON:\n' + JSON.stringify(model) + '\n\nCompare your render with the photo: proportions, colours, missing details, flat or wrong hidden sides. Return the FULL corrected model JSON in the same format, plus a "critique" field (one or two sentences on what you changed).' }
    ]);
  }
  throw new Error('Unknown mode');
}
module.exports = { run, parse };
