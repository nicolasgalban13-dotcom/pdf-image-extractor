const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFImage = require('pdf-image').PDFImage;
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.static('public'));

// Configurar almacenamiento de archivos
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

// Endpoint para extraer imágenes
app.post('/extract-images', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún PDF' });
        }

        const pdfPath = path.join(__dirname, req.file.path);
        const outputDir = path.join(__dirname, 'extracted_images', `pdf_${Date.now()}`);

        // Crear directorio de salida
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        console.log(`Procesando: ${pdfPath}`);
        console.log(`Salida: ${outputDir}`);

        // Usar pdf-image para extraer
        const pdfImage = new PDFImage(pdfPath, {
            convertOptions: {
                '-quality': '95',
                '-density': '150'
            }
        });

        // Obtener número de páginas
        const numberOfPages = await pdfImage.numberOfPages();
        console.log(`Total de páginas: ${numberOfPages}`);

        const images = [];

        // Extraer imagen de cada página
        for (let i = 0; i < numberOfPages; i++) {
            try {
                console.log(`Extrayendo página ${i + 1}...`);
                
                const imagePath = await pdfImage.convertPage(i);
                const outputPath = path.join(outputDir, `page_${i + 1}.jpg`);
                
                // Copiar imagen extraída
                fs.copyFileSync(imagePath, outputPath);
                
                // Leer imagen como base64
                const imageData = fs.readFileSync(outputPath);
                const base64 = imageData.toString('base64');

                images.push({
                    page: i + 1,
                    filename: `page_${i + 1}.jpg`,
                    base64: `data:image/jpeg;base64,${base64}`,
                    size: imageData.length
                });

                // Limpiar archivo temporal
                fs.unlinkSync(imagePath);
            } catch (err) {
                console.error(`Error en página ${i + 1}:`, err);
            }
        }

        // Limpiar archivo PDF subido
        fs.unlinkSync(pdfPath);

        if (images.length === 0) {
            return res.status(400).json({ 
                error: 'No se pudieron extraer imágenes del PDF' 
            });
        }

        res.json({
            success: true,
            imageCount: images.length,
            images: images
        });

    } catch (error) {
        console.error('Error:', error);
        
        // Limpiar archivo si existe
        if (req.file) {
            try {
                fs.unlinkSync(path.join(__dirname, req.file.path));
            } catch (e) {}
        }

        res.status(500).json({ 
            error: error.message || 'Error al procesar el PDF' 
        });
    }
});

// Endpoint de health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log('📤 Accede a http://localhost:3000 para subir PDFs\n');
});
