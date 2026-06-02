const { tmplBienvenida, tmplContribucion, tmplAprobacionHTML, tmplYieldDisponible } = require('./templates/htmlTemplates');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'test-output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const mockData = {
  nombre: 'Usuario de Prueba',
  proyecto: 'Proyecto Solar Comunitario',
  monto: '5,000.00',
  fecha: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
  yield: '250.00',
  url: 'https://bimex-frontend.vercel.app/proyectos/1',
};

fs.writeFileSync(path.join(outputDir, 'bienvenida.html'), tmplBienvenida(mockData));
fs.writeFileSync(path.join(outputDir, 'contribucion.html'), tmplContribucion(mockData));
fs.writeFileSync(path.join(outputDir, 'aprobacion.html'), tmplAprobacionHTML(mockData));
fs.writeFileSync(path.join(outputDir, 'yield-disponible.html'), tmplYieldDisponible(mockData));

console.log('Templates generados en test-output/');
console.log('Abre los archivos HTML en tu navegador para previsualizar.');
