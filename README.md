# 📄 Extractor de Imágenes PDF - Backend

Un backend profesional para extraer imágenes de PDFs con precisión usando Node.js + Express + Poppler.

## 🚀 Inicio Rápido

### 1️⃣ Instalar Poppler (herramienta de sistema)

**En Windows:**
```bash
choco install poppler
# o descargar desde: https://github.com/oschwartz10612/poppler-windows/releases/
```

**En macOS:**
```bash
brew install poppler
```

**En Linux (Ubuntu/Debian):**
```bash
sudo apt-get install poppler-utils
```

### 2️⃣ Instalar dependencias Node.js

```bash
npm install
```

### 3️⃣ Ejecutar el servidor

```bash
npm start
```

El servidor estará en: **http://localhost:3000**

## 📋 Requisitos

- **Node.js 14+** ([Descargar](https://nodejs.org))
- **Poppler** (para extracción de imágenes)

## 📦 Dependencias

- **express** - Servidor web
- **multer** - Manejo de uploads
- **cors** - Cross-Origin Resource Sharing
- **pdf-image** - Extracción usando Poppler

## 🔌 API

### POST /extract-images

Extrae imágenes de un PDF.

**Request:**
```
POST http://localhost:3000/extract-images
Content-Type: multipart/form-data

{
  "pdf": <archivo.pdf>
}
```

**Response:**
```json
{
  "success": true,
  "imageCount": 2,
  "images": [
    {
      "page": 1,
      "filename": "page_1.jpg",
      "base64": "data:image/jpeg;base64,...",
      "size": 45234
    },
    {
      "page": 2,
      "filename": "page_2.jpg",
      "base64": "data:image/jpeg;base64,...",
      "size": 52341
    }
  ]
}
```

### GET /health

Verifica que el servidor esté activo.

```bash
curl http://localhost:3000/health
# {"status": "ok"}
```

## 🎯 Features

✅ Extrae imágenes de PDFs con precisión  
✅ Soporta múltiples páginas  
✅ Retorna imágenes en base64 para descarga directa  
✅ Interfaz web moderna incluida  
✅ Manejo de errores robusto  
✅ Limpieza automática de archivos  

## 📂 Estructura

```
.
├── server.js           # Servidor Express
├── package.json        # Dependencias
├── public/
│   └── index.html      # Frontend
├── uploads/            # Archivos subidos (temporal)
└── extracted_images/   # Imágenes extraídas (temporal)
```

## 🚢 Despliegue

### Railway.app (Recomendado - GRATIS)

```bash
npm install -g railway
railway login
railway init
railway up
```

### Heroku

```bash
heroku create
git push heroku main
```

### Render.com

1. Conecta tu repo GitHub
2. Crea nuevo Web Service
3. Deploy automático

## ⚙️ Variables de Entorno

```env
PORT=3000              # Puerto del servidor
NODE_ENV=production    # Entorno
```

## 🐛 Troubleshooting

**Error: "poppler not found"**
→ Instala Poppler (ver paso 1 arriba)

**Error: "EADDRINUSE: address already in use"**
→ Puerto 3000 está en uso. Cambia con: `PORT=3001 npm start`

**No extrae imágenes**
→ Verifica que el PDF tenga imágenes embebidas (no escaneado)

## 💡 Uso desde Terminal

```bash
# Subir PDF y obtener imágenes (curl)
curl -F "pdf=@mi_archivo.pdf" http://localhost:3000/extract-images | jq
```

## 📝 Notas

- Las imágenes se extraen con calidad 95%
- Densidad de extracción: 150 DPI
- Máximo tamaño PDF: 25MB (configurable)
- Archivos temporales se limpian automáticamente

## 📄 Licencia

MIT

---

**Desarrollado para extraer imágenes de PDFs profesionalmente** ✨
