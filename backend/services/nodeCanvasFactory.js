// services/nodeCanvasFactory.js
// Canvas factory for pdfjs-dist to render PDF pages in Node.js

const { createCanvas } = require('canvas');

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return {
      canvas,
      context,
    };
  }
}

module.exports = { NodeCanvasFactory };
