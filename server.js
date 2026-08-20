onst express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const pdfjs = require('pdfjs-dist/legacy/build/pdf');
const sharp = require('sharp');
 
const app = express();
const PORT = process.env.PORT || 3000;
 
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
 
// Función para extraer imágenes del PDF
async function extractImagesFromPDF(pdfBuffer) {
    const uint8Array = new Uint8Array(pdfBuffer);
    
    const pdf = await pdfjs.getDocument({ 
        data: uint8Array,
        disableWorker: true
    }).promise;
    
    const numPages = pdf.numPages;
    const images = [];
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
            const page = await pdf.getPage(pageNum);
            const operatorList = await page.getOperatorList();
            
            // Buscar operadores de imagen en la página
            const imageIndices = [];
            for (let i = 0; i < operatorList.fnArray.length; i++) {
                // 89 = EI (End Image), 84 = ID (Image Data), 77 = M (Image)
                if (operatorList.fnArray[i] === pdfjs.OPS.paintImageXObject || 
                    operatorList.fnArray[i] === pdfjs.OPS.paintInlineImageXObject) {
                    imageIndices.push(i);
                }
            }
            
            // Si no hay imágenes con operadores, renderiza la página completa
            if (imageIndices.length === 0) {
                const viewport = page.getViewport({ scale: 3 });
                const { createCanvas } = require('canvas');
                const canvas = createCanvas(viewport.width, viewport.height);
                const context = canvas.getContext('2d');
                
                context.fillStyle = 'white';
                context.fillRect(0, 0, viewport.width, viewport.height);
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                
                const buffer = canvas.toBuffer('image/jpeg', { quality: 0.98 });
                const base64 = buffer.toString('base64');
                
                images.push({
                    page: pageNum,
                    filename: `page_${pageNum}.jpg`,
                    base64: `data:image/jpeg;base64,${base64}`,
                    size: buffer.length
                });
                
                console.log(`✓ Página ${pageNum} extraída (${(buffer.length / 1024).toFixed(1)} KB)`);
            } else {
                // Extraer cada imagen encontrada
                const resources = await page.getResources();
                
                if (resources && resources.get('XObject')) {
                    const xobjects = resources.get('XObject');
                    
                    for (const [name, xobject] of xobjects.entries()) {
                        try {
                            if (xobject.dict && xobject.dict.get('Subtype').name === 'Image') {
                                const width = xobject.dict.get('Width');
                                const height = xobject.dict.get('Height');
                                
                                // Obtener datos de imagen
                                const imageData = await xobject.getImage();
                                
                                if (imageData) {
                                    // Convertir a buffer
                                    let imgBuffer = await sharp(imageData.data, {
                                        raw: {
                                            width: imageData.width,
                                            height: imageData.height,
                                            channels: imageData.numComponents
                                        }
                                    })
                                    .jpeg({ quality: 95 })
                                    .toBuffer();
                                    
                                    const base64 = imgBuffer.toString('base64');
                                    
                                    images.push({
                                        page: pageNum,
                                        filename: `page_${pageNum}_img_${images.length}.jpg`,
                                        base64: `data:image/jpeg;base64,${base64}`,
                                        size: imgBuffer.length
                                    });
                                    
                                    console.log(`✓ Imagen extraída de página ${pageNum}`);
                                }
                            }
                        } catch (err) {
                            console.log(`No se pudo extraer imagen: ${err.message}`);
                        }
                    }
                }
            }
        } catch (err) {
            console.error(`Error en página ${pageNum}:`, err.message);
        }
    }
    
    return images;
}
 
app.post('/extract-images', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún PDF' });
        }
 
        const pdfPath = path.join(__dirname, req.file.path);
        const pdfBuffer = fs.readFileSync(pdfPath);
        
        console.log('Extrayendo imágenes del PDF...');
        
        const images = await extractImagesFromPDF(pdfBuffer);
        
        fs.unlinkSync(pdfPath);
 
        if (images.length === 0) {
            return res.status(400).json({ 
                error: 'No se encontraron imágenes en el PDF' 
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
