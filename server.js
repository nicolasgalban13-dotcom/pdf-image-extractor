const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// ⭐ SERVIR ARCHIVOS ESTÁTICOS (index.html, css, js)
app.use(express.static(path.join(__dirname)));

// ⭐ RUTA RAÍZ - Servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// CONFIGURAR MULTER
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

// ENDPOINT PARA EXTRAER IMÁGENES
app.post('/extract-images', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún PDF' });
        }

        const pdfPath = path.join(__dirname, req.file.path);
        const outputDir = path.join(__dirname, 'extracted_images', `pdf_${Date.now()}`);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        console.log(`Procesando: ${pdfPath}`);

        return new Promise((resolve) => {
            const pdfimages = spawn('pdfimages', ['-jpeg', pdfPath, path.join(outputDir, 'page')]);
            
            pdfimages.on('close', (code) => {
                if (code === 0) {
                    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.jpg'));
                    
                    if (files.length === 0) {
                        fs.unlinkSync(pdfPath);
                        return res.status(400).json({ error: 'No se encontraron imágenes en el PDF' });
                    }

                    const images = files.map((file, index) => {
                        const fullPath = path.join(outputDir, file);
                        const imageData = fs.readFileSync(fullPath);
                        const base64 = imageData.toString('base64');
                        fs.unlinkSync(fullPath);
                        
                        return {
                            page: index + 1,
                            filename: file,
                            base64: `data:image/jpeg;base64,${base64}`,
                            size: imageData.length
                        };
                    });

                    fs.unlinkSync(pdfPath);
                    fs.rmdirSync(outputDir);

                    res.json({
                        success: true,
                        imageCount: images.length,
                        images: images
                    });
                } else {
                    fs.unlinkSync(pdfPath);
                    res.status(500).json({ error: 'Error al procesar PDF' });
                }
            });

            pdfimages.on('error', (err) => {
                console.error('Error:', err);
                fs.unlinkSync(pdfPath);
                res.status(500).json({ error: 'Error: ' + err.message });
            });
        });

    } catch (error) {
        console.error('Error:', error);
        if (req.file) {
            try {
                fs.unlinkSync(path.join(__dirname, req.file.path));
            } catch (e) {}
        }
        res.status(500).json({ error: error.message });
    }
});

// HEALTH CHECK
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// INICIAR SERVIDOR
app.listen(PORT, () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
});
