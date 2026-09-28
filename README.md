# BlockForge - photo to Roblox block model

1. Upload a photo (extra angles optional).
2. You instantly get a pixel-relief 3D preview, then the AI designs a full block model
   (front, back, sides, top), picks materials and textures, and checks its own work:
   it renders its model from 4 sides, compares that with your photo, and fixes mistakes.
3. A live % bar shows every step. Download Roblox Lua, FBX, OBJ or JSON.

## Deploy on Render (recommended)
Push this folder to GitHub, then Render > New > Blueprint (render.yaml). Add env var
`ANTHROPIC_API_KEY`. Optional: `MODEL` (default `claude-sonnet-5`). No npm packages needed.

## Deploy on Netlify
Import the repo (netlify.toml is included), add `ANTHROPIC_API_KEY` under Site settings >
Environment variables. Netlify functions time out quickly (10s default, up to 26s), so a
full AI build may fail there. Use Render, or set self-check passes to 0.

## Local
`ANTHROPIC_API_KEY=sk-... node server.js` then open http://localhost:3000

## Using the files
- Roblox Lua: Studio > View > Command Bar, paste, Enter. Builds real Parts with colours + materials.
- FBX / OBJ: 1 unit = 1 stud, one mesh per colour. Open in Blender or Studio's 3D importer.
