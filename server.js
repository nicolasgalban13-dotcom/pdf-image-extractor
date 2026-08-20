const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { createCanvas } = require('canvas');
const pdfjs = require('pdfjs-dist/legacy/build/pdf');
 
const app = express();
const PORT = process.env.PORT || 3000;
 
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
 
app.use(cors());
app.use(express.static(path.join(__dirname)));
 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
 
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = 'uploads';
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, `pdf_${Date.now()}${path.extname(file.originalname)}`);
    }
});
 
const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            cb(new Error('Solo se permiten archivos PDF'));
        } else {
            cb(null, true);
        }
    }
});
 
app.post('/extract-images', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún PDF' });
        }
 
        const pdfPath = path.join(__dirname, req.file.path);
        const pdfBuffer = fs.readFileSync(pdfPath);
        
        // ⭐ CONVERTIR Buffer a Uint8Array
        const uint8Array = new Uint8Array(pdfBuffer);
 
        // Cargar PDF
        const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;
        const numPages = pdf.numPages;
 
        console.log(`PDF con ${numPages} páginas procesado`);
 
        const images = [];
        const scale = 2;
 
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            try {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale });
 
                const canvas = createCanvas(viewport.width, viewport.height);
                const context = canvas.getContext('2d');
 
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
 
                await page.render(renderContext).promise;
 
                const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
                const base64 = buffer.toString('base64');
 
                images.push({
                    page: pageNum,
                    filename: `page_${pageNum}.jpg`,
                    base64: `data:image/jpeg;base64,${base64}`,
                    size: buffer.length
                });
 
                console.log(`Página ${pageNum} procesada ✓`);
            } catch (err) {
                console.error(`Error en página ${pageNum}:`, err.message);
            }
        }
 
        fs.unlinkSync(pdfPath);
 
        if (images.length === 0) {
            return res.status(400).json({ 
                error: 'No se pudieron procesar las páginas del PDF' 
            });
        }
 
        res.json({
            success: true,
            imageCount: images.length,
            images: images
        });
 
    } catch (error) {
        console.error('Error:', error.message);
        if (req.file) {
            try {
                fs.unlinkSync(path.join(__dirname, req.file.path));
            } catch (e) {}
        }
        res.status(500).json({ error: 'Error: ' + error.message });
    }
});
 
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
 
app.listen(PORT, () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
});
