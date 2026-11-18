// Uso: node build.js <usuario|tecnico>  -> escribe raw-<m>.docx y meta-<m>.json
const fs = require('fs');
const path = require('path');
process.env.NODE_PATH = require('child_process').execSync('npm root -g').toString().trim();
require('module').Module._initPaths();
const { crear, documento, Packer } = require('./lib');
const m = process.argv[2];
const pages = fs.existsSync(`pages-${m}.json`) ? JSON.parse(fs.readFileSync(`pages-${m}.json`)) : {};
const ctx = crear(pages);
const img = (n) => path.resolve('shots', n);
const dg = (n) => path.resolve('diag', n);
const cuerpo = require(`./contenido-${m}.js`)(ctx, img, dg).flat();
const titulo = m === 'usuario' ? 'Manual de Usuario' : 'Manual Técnico';
const doc = documento(titulo, 'Equipo 5', ctx, cuerpo, pages);
Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(`raw-${m}.docx`, b);
  fs.writeFileSync(`meta-${m}.json`, JSON.stringify({ heads: ctx.heads, figs: ctx.figs, tabs: ctx.tabs }));
  console.log('raw ok', ctx.heads.length, 'títulos', ctx.figs.length, 'figuras', ctx.tabs.length, 'tablas');
});
