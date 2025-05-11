// Elementos del DOM
const clearBtn = document.getElementById('clearBtn');
const organizeBtn = document.getElementById('organizeBtn');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const luminousBtn = document.getElementById('luminousBtn');
const container = document.getElementById('container');
const palette = document.getElementById('palette');
const voiceSelect = document.getElementById('voiceSelect');
const rateControl = document.getElementById('rateControl');
const rateValue = document.getElementById('rateValue');
const advancedControls = document.getElementById('advancedControls');
const apiKeyInput = document.getElementById('apiKeyInput');
const editorContainer = document.getElementById('editorContainer');
const editorModeBtn = document.getElementById('editorModeBtn');
const interactiveModeBtn = document.getElementById('interactiveModeBtn');
const playbackControls = document.getElementById('playbackControls');

// Variables de estado
let colorTarget = null;
let voices = [];
let currentUtterance = null;
let speechActive = false;
let lastCharIndex = 0;
let originalPositions = [];
let currentY = 30;
let luminousActive = false;
let words = []; // Almacenar palabras generadas
let containerText = ""; // Texto actual en el contenedor
let isComposing = false; // Para manejar composición IME
let currentAudio = null; // Variable para controlar el audio actual
let isEditorMode = true; // Modo editor activo por defecto
let originalText = ""; // Variable para almacenar el texto original
let editor = null; // Variable para la instancia del editor

// Inicializar Monaco Editor
require(['vs/editor/editor.main'], function() {
  editor = monaco.editor.create(editorContainer, {
    value: '',
    language: 'plaintext',
    theme: 'vs-dark',
    automaticLayout: true,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "'Montserrat', sans-serif",
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    roundedSelection: true,
    padding: { top: 20, bottom: 20 },
    renderWhitespace: 'selection',
    quickSuggestions: false,
    wordBasedSuggestions: false,
    suggestOnTriggerCharacters: false,
    autoClosingBrackets: 'never',
    autoClosingQuotes: 'never',
    autoIndent: 'full',
    formatOnType: true,
    formatOnPaste: true,
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8
    }
  });
  
  // Actualizar el tema para que coincida con el diseño
  monaco.editor.defineTheme('custom-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: '#F9F8F8', background: '#1A1B26' },
      { token: 'delimiter.bracket', foreground: '#E8C547' }
    ],
    colors: {
      'editor.background': '#1A1B26',
      'editor.foreground': '#F9F8F8',
      'editor.lineHighlightBackground': '#2D3047',
      'editorCursor.foreground': '#E8C547',
      'editor.selectionBackground': '#5C678455',
      'editor.inactiveSelectionBackground': '#5C678433',
      'editor.lineHighlightBorder': '#2D3047',
      'editorGutter.background': '#1A1B26',
      'editorGutter.modifiedBackground': '#48CAE4',
      'editorGutter.addedBackground': '#8AC926',
      'editorGutter.deletedBackground': '#E63946',
      'editorBracketMatch.background': '#5C678477',
      'editorBracketMatch.border': '#5C6784',
      'editor.lineNumbers': '#5C6784',
      'editor.lineNumbers.active': '#E8C547',
      'editorWhitespace.foreground': '#5C678455'
    }
  });
  
  monaco.editor.setTheme('custom-dark');
  
  // Mostrar mensaje de placeholder cuando el editor está vacío
  function updatePlaceholder() {
    const hasText = editor.getValue().length > 0;
    const instructionMsg = document.getElementById('instructionMsg');
    
    if (!hasText && !instructionMsg) {
      showInstructionMessage();
    } else if (hasText && instructionMsg) {
      instructionMsg.classList.add('hidden');
    }
  }
  
  // Escuchar cambios en el editor
  editor.onDidChangeModelContent(updatePlaceholder);
  
  // Mostrar mensaje inicial
  updatePlaceholder();
  
  // Configurar el editor para no marcar :) como error
  monaco.languages.setLanguageConfiguration('plaintext', {
    brackets: [
      ['(', ')'],
      ['[', ']'],
      ['{', '}']
    ],
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
      { open: '{', close: '}' },
      { open: '"', close: '"', notIn: ['string'] },
      { open: "'", close: "'", notIn: ['string', 'comment'] }
    ]
  });
});

// Función para mostrar el mensaje de instrucción
function showInstructionMessage() {
  const instructionMsg = document.createElement('div');
  instructionMsg.id = 'instructionMsg';
  instructionMsg.textContent = 'Haz clic aquí y comienza a escribir...';
  
  // Solo agregar si no existe ya
  if (!document.getElementById('instructionMsg')) {
    container.appendChild(instructionMsg);
  }
  
  // Ocultar cuando el editor recibe foco
  editor.onDidFocusEditorWidget(() => {
    instructionMsg.classList.add('hidden');
  });
}

// Actualizar valores de los controles
rateControl.addEventListener('input', () => {
  rateValue.textContent = rateControl.value;
});

// Paleta de colores
const paletteColors = ['#E53935','#8E24AA','#3949AB','#00897B','#FDD835','#FB8C00','#6D4C41','#455A64'];
paletteColors.forEach(color => {
  const sw = document.createElement('div');
  sw.className = 'swatch';
  sw.style.background = color;
  sw.addEventListener('click', () => {
    if (colorTarget) {
      colorTarget.style.color = color;
      if (colorTarget.classList.contains('luminous')) {
        colorTarget.classList.add('luminous');
      }
    }
    palette.style.display = 'none';
  });
  palette.appendChild(sw);
});

// Botón de modo luminoso
luminousBtn.addEventListener('click', () => {
  luminousActive = !luminousActive;
  
  if (luminousActive) {
    luminousBtn.classList.add('active');
    if (isEditorMode) {
      // Aplicar efecto luminoso al texto del editor
      editor.updateOptions({
        styles: {
          'luminous-text': {
            textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
            filter: 'brightness(1.5)'
          }
        }
      });
      // Aplicar la clase a todo el texto
      const model = editor.getModel();
      const decorations = editor.deltaDecorations([], [
        {
          range: model.getFullModelRange(),
          options: {
            inlineClassName: 'luminous-text'
          }
        }
      ]);
    } else {
      document.querySelectorAll('.letter').forEach(letter => {
        letter.classList.add('luminous');
      });
    }
  } else {
    luminousBtn.classList.remove('active');
    if (isEditorMode) {
      // Quitar efecto luminoso del texto del editor
      editor.deltaDecorations(editor.getModel().getAllDecorations()
        .filter(d => d.options.inlineClassName === 'luminous-text')
        .map(d => d.id), []);
    } else {
      document.querySelectorAll('.letter').forEach(letter => {
        letter.classList.remove('luminous');
      });
    }
  }
});

// Cargar voces disponibles para Google Cloud TTS
function loadVoices() {
  // Voces predefinidas para Google Cloud TTS
  voices = [
    { name: 'en-US-Standard-B', lang: 'en-US', voiceURI: 'en-US-Standard-B' },
    { name: 'es-US-Standard-A', lang: 'es-US', voiceURI: 'es-US-Standard-A' },
    { name: 'es-US-Standard-B', lang: 'es-US', voiceURI: 'es-US-Standard-B' },
    { name: 'es-US-Standard-C', lang: 'es-US', voiceURI: 'es-US-Standard-C' },
    { name: 'es-US-Wavenet-A', lang: 'es-US', voiceURI: 'es-US-Wavenet-A' },
    { name: 'es-US-Wavenet-B', lang: 'es-US', voiceURI: 'es-US-Wavenet-B' },
    { name: 'es-US-Wavenet-C', lang: 'es-US', voiceURI: 'es-US-Wavenet-C' },
    { name: 'es-ES-Standard-A', lang: 'es-ES', voiceURI: 'es-ES-Standard-A' },
    { name: 'es-ES-Standard-B', lang: 'es-ES', voiceURI: 'es-ES-Standard-B' },
    { name: 'es-ES-Standard-C', lang: 'es-ES', voiceURI: 'es-ES-Standard-C' },
    { name: 'es-ES-Wavenet-A', lang: 'es-ES', voiceURI: 'es-ES-Wavenet-A' },
    { name: 'es-ES-Wavenet-B', lang: 'es-ES', voiceURI: 'es-ES-Wavenet-B' },
    { name: 'es-ES-Wavenet-C', lang: 'es-ES', voiceURI: 'es-ES-Wavenet-C' },
    { name: 'en-US-Standard-A', lang: 'en-US', voiceURI: 'en-US-Standard-A' },
    { name: 'en-US-Standard-C', lang: 'en-US', voiceURI: 'en-US-Standard-C' },
    { name: 'en-US-Standard-D', lang: 'en-US', voiceURI: 'en-US-Standard-D' },
    { name: 'en-US-Standard-E', lang: 'en-US', voiceURI: 'en-US-Standard-E' },
    { name: 'en-US-Standard-F', lang: 'en-US', voiceURI: 'en-US-Standard-F' },
    { name: 'en-US-Standard-G', lang: 'en-US', voiceURI: 'en-US-Standard-G' },
    { name: 'en-US-Standard-H', lang: 'en-US', voiceURI: 'en-US-Standard-H' },
    { name: 'en-US-Standard-I', lang: 'en-US', voiceURI: 'en-US-Standard-I' },
    { name: 'en-US-Standard-J', lang: 'en-US', voiceURI: 'en-US-Standard-J' },
    { name: 'en-US-Wavenet-A', lang: 'en-US', voiceURI: 'en-US-Wavenet-A' },
    { name: 'en-US-Wavenet-B', lang: 'en-US', voiceURI: 'en-US-Wavenet-B' },
    { name: 'en-US-Wavenet-C', lang: 'en-US', voiceURI: 'en-US-Wavenet-C' },
    { name: 'en-US-Wavenet-D', lang: 'en-US', voiceURI: 'en-US-Wavenet-D' },
    { name: 'en-US-Wavenet-E', lang: 'en-US', voiceURI: 'en-US-Wavenet-E' },
    { name: 'en-US-Wavenet-F', lang: 'en-US', voiceURI: 'en-US-Wavenet-F' },
    { name: 'en-US-Wavenet-G', lang: 'en-US', voiceURI: 'en-US-Wavenet-G' },
    { name: 'en-US-Wavenet-H', lang: 'en-US', voiceURI: 'en-US-Wavenet-H' },
    { name: 'en-US-Wavenet-I', lang: 'en-US', voiceURI: 'en-US-Wavenet-I' },
    { name: 'en-US-Wavenet-J', lang: 'en-US', voiceURI: 'en-US-Wavenet-J' }
  ];
  
  voiceSelect.innerHTML = '';
  
  voices.forEach(voice => {
    const option = document.createElement('option');
    option.value = voice.voiceURI;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });
}

// Función para cambiar entre modos
function toggleEditorMode() {
  isEditorMode = !isEditorMode;
  
  if (isEditorMode) {
    // Cambiar a modo editor
    editorContainer.classList.remove('hidden');
    editorModeBtn.style.display = 'none';
    interactiveModeBtn.style.display = 'inline-flex';
    
    // Ocultar botones específicos del modo interactivo
    organizeBtn.style.display = 'none';
    playbackControls.style.display = 'none';
    
    // Eliminar todas las letras interactivas
    document.querySelectorAll('.letter').forEach(letter => letter.remove());
    
    // Mostrar placeholder si no hay texto
    if (editor.getValue().length === 0) {
      showInstructionMessage();
    }
    
    // Aplicar efecto luminoso si está activo
    if (luminousActive) {
      const model = editor.getModel();
      const decorations = editor.deltaDecorations([], [
        {
          range: model.getFullModelRange(),
          options: {
            inlineClassName: 'luminous-text'
          }
        }
      ]);
    }
    
    // Enfocar el editor
    editor.focus();
  } else {
    // Cambiar a modo interactivo
    // Guardar el texto original antes de cambiar al modo interactivo
    originalText = editor.getValue();
    
    editorContainer.classList.add('hidden');
    editorModeBtn.style.display = 'inline-flex';
    interactiveModeBtn.style.display = 'none';
    
    // Mostrar botones específicos del modo interactivo
    organizeBtn.style.display = 'inline-flex';
    playbackControls.style.display = 'flex';
    
    // Convertir el texto del editor a letras interactivas
    convertTextToLetters();
    
    // Aplicar efecto luminoso si está activo
    if (luminousActive) {
      document.querySelectorAll('.letter').forEach(letter => {
        letter.classList.add('luminous');
      });
    }
    
    // Verificar si las letras están ordenadas y habilitar el botón de reproducción
    playBtn.disabled = !areLettersInOriginalPosition();
  }
}

// Función para convertir el texto del editor a letras interactivas
function convertTextToLetters() {
  const text = editor.getValue();
  if (!text) return;
  
  // Limpiar letras existentes
  document.querySelectorAll('.letter').forEach(letter => letter.remove());
  
  // Reiniciar variables
  originalPositions = [];
  words = [];
  currentY = 30;
  
  // Procesar el texto línea por línea
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    let x = 10;
    let y = currentY + (lineIndex * 40);
    let currentWord = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === ' ') {
        // Espacio - avanzar y registrar palabra
        x += 20;
        if (currentWord) {
          words.push(currentWord);
          currentWord = '';
        }
        continue;
      }
      
      // Crear letra
      const span = document.createElement('span');
      span.className = 'letter';
      span.textContent = char;
      
      if (luminousActive) {
        span.classList.add('luminous');
      }
      
      // Generar un ID único para la letra
      const letterId = 'letter-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
      span.dataset.id = letterId;
      
      // Posicionar la letra
      span.style.left = x + 'px';
      span.style.top = y + 'px';
      
      // Guardar posición original
      originalPositions.push({
        id: letterId,
        left: x + 'px',
        top: y + 'px',
        wordIndex: words.length,
        charIndex: currentWord.length
      });
      
      // Actualizar palabra actual
      currentWord += char;
      
      // Hacer la letra arrastrable
      makeDraggable(span);
      
      // Añadir al contenedor
      container.appendChild(span);
      
      // Calcular siguiente posición (usar el ancho real de la letra)
      x += span.offsetWidth + 2;
      
      // Si estamos al final de la línea, pasar a la siguiente
      if (x > container.clientWidth - 40) {
        x = 10;
        y += 40;
        currentY = y;
      }
    }
    
    // Añadir la última palabra de la línea
    if (currentWord) {
      words.push(currentWord);
    }
  });
  
  // Actualizar currentY para la próxima vez
  currentY = Math.max(currentY, 30 + (lines.length * 40));
}

// Función para verificar si las letras están en su posición original
function areLettersInOriginalPosition() {
  const letters = document.querySelectorAll('.letter');
  if (letters.length === 0) return true;
  
  for (const letter of letters) {
    const originalPos = originalPositions.find(pos => pos.id === letter.dataset.id);
    if (!originalPos) return false;
    
    const currentLeft = parseFloat(letter.style.left);
    const currentTop = parseFloat(letter.style.top);
    const originalLeft = parseFloat(originalPos.left);
    const originalTop = parseFloat(originalPos.top);
    
    // Permitir un pequeño margen de error por redondeo
    if (Math.abs(currentLeft - originalLeft) > 1 || Math.abs(currentTop - originalTop) > 1) {
      return false;
    }
  }
  return true;
}

// Función para organizar letras a su posición original (MODIFICADA)
organizeBtn.addEventListener('click', () => {
  const letters = document.querySelectorAll('.letter');
  letters.forEach((letter) => {
    if (letter.raf) {
      cancelAnimationFrame(letter.raf);
    }
    
    letter.style.transform = 'scale(1)';
    letter.isGrowing = false;
    
    // Buscar la posición original por ID
    const originalPos = originalPositions.find(pos => pos.id === letter.dataset.id);
    
    if (originalPos) {
      letter.style.left = originalPos.left;
      letter.style.top = originalPos.top;
    }
  });
  
  // Habilitar el botón Play después de organizar
  playBtn.disabled = false;
});

// Variable global para el arrastre
let dragging = false;
let initialX, initialY;

// Función para hacer las letras arrastrables (MODIFICADA)
function makeDraggable(el) {
  let offsetX=0, offsetY=0;
  let prevTime=0, prevX=0, prevY=0;
  let lastTime=0, lastX=0, lastY=0;
  let isClickEvent = true;
  el.isGrowing=false;

  el.addEventListener('pointerdown', (e) => {
    dragging = true;
    isClickEvent = true;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    initialX = parseFloat(el.style.left);
    initialY = parseFloat(el.style.top);
    if (el.raf) cancelAnimationFrame(el.raf);
    
    // Escalar la letra cuando se toma
    el.style.transform = 'scale(3)';
    el.isGrowing = true;
    
    const now = Date.now(); prevTime = lastTime = now;
    prevX = lastX = e.clientX; prevY = lastY = e.clientY;
  });

  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    
    if (Math.abs(e.clientX - prevX) > 0 || Math.abs(e.clientY - prevY) > 0) {
      isClickEvent = false;
      
      // Verificar si la posición ha cambiado aunque sea un píxel
      const pr = container.getBoundingClientRect();
      let x = e.clientX - pr.left - offsetX;
      let y = e.clientY - pr.top - offsetY;
      
      if (Math.abs(x - initialX) > 0 || Math.abs(y - initialY) > 0) {
        playBtn.disabled = true;
      }
    }
    
    const pr = container.getBoundingClientRect();
    let x = e.clientX - pr.left - offsetX;
    let y = e.clientY - pr.top - offsetY;
    x = Math.max(0, Math.min(x, pr.width - el.offsetWidth));
    y = Math.max(0, Math.min(y, pr.height - el.offsetHeight));
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    const now = Date.now(); prevTime = lastTime; prevX = lastX; prevY = lastY;
    lastTime = now; lastX = e.clientX; lastY = e.clientY;
  });

  el.addEventListener('pointerup', (e) => {
    if (dragging) {
      if (isClickEvent) {
        colorTarget = el;
        palette.style.left = e.clientX + 'px';
        palette.style.top = e.clientY + 'px';
        palette.style.display = 'grid';
        e.stopPropagation();
      } else {
        const dt = lastTime - prevTime;
        const dx = lastX - prevX, dy = lastY - prevY;
        const vx = dt > 0 ? dx/dt : 0, vy = dt > 0 ? dy/dt : 0;
        simulatePhysics(el, vx * 10, vy * 10);
      }
    }
    dragging = false;
    el.releasePointerCapture(e.pointerId);
    
    // Si no hay movimiento (no se lanzó), volver al tamaño normal
    if (Math.abs(lastX - prevX) < 3 && Math.abs(lastY - prevY) < 3) {
      el.style.transform = 'scale(1)';
      el.isGrowing = false;
    }
  });
}

// Física para el rebote - VERSIÓN MODIFICADA
function simulatePhysics(el, vx, vy) {
  const friction = 0.99, bounceFactor = 0.8;
  let hasBounced = false;
  
  function step() {
    // Obtener dimensiones actualizadas en cada frame
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    
    // Calcular dimensiones reales considerando la escala actual
    const scaleX = el.isGrowing ? 3 : 1;
    const scaleY = el.isGrowing ? 3 : 1;
    const elWidth = elRect.width / scaleX;
    const elHeight = elRect.height / scaleY;
    
    // Convertir posición a coordenadas relativas al contenedor
    let x = parseFloat(el.style.left);
    let y = parseFloat(el.style.top);
    
    // Calcular nueva posición
    let nextX = x + vx;
    let nextY = y + vy;
    
    // Variables para detectar colisiones precisas
    let hitLeft = false, hitRight = false, hitTop = false, hitBottom = false;
    
    // Detección de colisiones con precisión de píxel, considerando escala
    // Borde izquierdo - CORRECCIÓN: usar Math.floor para evitar sobrepasar
    if (nextX <= 0) {
      nextX = 0;
      vx = -vx * bounceFactor;
      hitLeft = true;
    }
    // Borde derecho
    else if (Math.floor(nextX + (elWidth * scaleX)) >= containerRect.width) {
      nextX = containerRect.width - (elWidth * scaleX);
      vx = -vx * bounceFactor;
      hitRight = true;
    }
    
    // Borde superior
    if (nextY <= 0) {
      nextY = 0;
      vy = -vy * bounceFactor;
      hitTop = true;
    }
    // Borde inferior - CORRECCIÓN: usar Math.floor y ajustar posición exacta
    else if (Math.floor(nextY + (elHeight * scaleY)) >= containerRect.height) {
      nextY = containerRect.height - (elHeight * scaleY);
      vy = -vy * bounceFactor;
      hitBottom = true;
    }
    
    // Aplicar fricción solo si no hay colisión en este frame
    if (!hitLeft && !hitRight && !hitTop && !hitBottom) {
      vx *= friction;
      vy *= friction;
    }
    
    // Actualizar posición con precisión
    el.style.left = nextX + 'px';
    el.style.top = nextY + 'px';
    
    // Continuar la animación si aún hay movimiento significativo
    if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
      el.raf = requestAnimationFrame(step);
    } else {
      // Detener la animación cuando la velocidad es muy baja
      // Volver al tamaño normal cuando se detiene
      el.style.transform = 'scale(1)';
      el.isGrowing = false;
      cancelAnimationFrame(el.raf);
    }
  }
  
  el.raf = requestAnimationFrame(step);
}

// Función para leer texto usando Google Cloud TTS
async function speakText() {
  const letters = document.querySelectorAll('.letter');
  if (letters.length === 0) return;
  
  // Reconstruir el texto en el orden correcto (línea por línea, de izquierda a derecha)
  let lines = {};
  
  // Agrupar letras por línea (posición Y)
  letters.forEach(letter => {
    const y = Math.round(parseFloat(letter.style.top)) || 0;
    if (!lines[y]) {
      lines[y] = [];
    }
    
    // Guardar la letra con su posición X
    lines[y].push({
      x: parseFloat(letter.style.left) || 0,
      char: letter.textContent
    });
  });
  
  // Ordenar las líneas por posición Y (de arriba a abajo)
  const sortedLines = Object.keys(lines).sort((a, b) => parseFloat(a) - parseFloat(b));
  
  // Construir el texto completo
  let fullText = '';
  sortedLines.forEach(y => {
    // Ordenar letras en la línea por posición X (de izquierda a derecha)
    lines[y].sort((a, b) => a.x - b.x);
    
    // Concatenar caracteres de la línea
    const lineText = lines[y].map(item => item.char).join('');
    fullText += lineText + ' ';
  });
  
  // Limpiar espacios múltiples y saltos de línea innecesarios
  fullText = fullText.replace(/\s+/g, ' ').trim();
  
  if (!fullText) return;

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    alert('Por favor ingresa tu Google Cloud API Key');
    return;
  }

  speechActive = true;
  playBtn.disabled = true;
  
  try {
    const selectedVoice = voiceSelect.value;
    const rate = parseFloat(rateControl.value);
    
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: fullText },
        voice: { 
          languageCode: selectedVoice.split('-').slice(0, 2).join('-'),
          name: selectedVoice
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: rate,
          pitch: 1.0,
          volumeGainDb: 0.0
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Error de Google TTS: ${response.statusText}`);
    }

    const data = await response.json();
    const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
    currentAudio = audio; // Guardar referencia al audio actual
    audio.play();

    audio.onended = () => {
      speechActive = false;
      lastCharIndex = 0;
      playBtn.disabled = !areLettersInOriginalPosition();
      currentAudio = null; // Limpiar referencia cuando termina
    };

  } catch (error) {
    console.error('Error al sintetizar voz:', error);
    alert('Error al sintetizar voz: ' + error.message);
    speechActive = false;
    playBtn.disabled = !areLettersInOriginalPosition();
    currentAudio = null;
  }
}

// Event listeners para los botones de control
playBtn.addEventListener('click', () => {
  if (!speechActive) {
    speakText();
  }
});

stopBtn.addEventListener('click', () => {
  speechActive = false;
  lastCharIndex = 0;
  playBtn.disabled = !areLettersInOriginalPosition();
  
  // Detener el audio actual si existe
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
});

clearBtn.addEventListener('click', () => {
  container.querySelectorAll('.letter').forEach(letter => letter.remove());
  speechActive = false;
  lastCharIndex = 0;
  playBtn.disabled = false;
  originalPositions = [];
  currentY = 30;
  words = [];
  editor.setValue('');
  originalText = '';
  
  // Mostrar placeholder
  showInstructionMessage();
  
  // Si estamos en modo interactivo, cambiar a modo editor
  if (!isEditorMode) {
    toggleEditorMode();
  }
  
  // Detener cualquier audio que esté reproduciéndose
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  
  // Notificar al usuario que se ha borrado todo
  const temporalMsg = document.createElement('div');
  temporalMsg.style.position = 'absolute';
  temporalMsg.style.top = '50%';
  temporalMsg.style.left = '50%';
  temporalMsg.style.transform = 'translate(-50%, -50%)';
  temporalMsg.style.padding = '10px';
  temporalMsg.style.background = 'rgba(0,0,0,0.7)';
  temporalMsg.style.color = 'white';
  temporalMsg.style.borderRadius = '5px';
  temporalMsg.style.opacity = '0';
  temporalMsg.style.transition = 'opacity 0.3s ease';
  temporalMsg.textContent = '¡Contenido borrado!';
  container.appendChild(temporalMsg);
  
  setTimeout(() => {
    temporalMsg.style.opacity = '1';
    setTimeout(() => {
      temporalMsg.style.opacity = '0';
      setTimeout(() => temporalMsg.remove(), 300);
    }, 1000);
  }, 10);
});

// Botones para cambiar entre modos
editorModeBtn.addEventListener('click', toggleEditorMode);
interactiveModeBtn.addEventListener('click', toggleEditorMode);

// Ocultar paleta al hacer clic fuera
document.addEventListener('pointerdown', (e) => {
  if (!e.target.classList.contains('letter') && !e.target.classList.contains('swatch') && e.target.id !== 'luminousBtn') {
    palette.style.display = 'none';
  }
});

// Inicializar voces
loadVoices();

// Mostrar mensaje inicial de instrucción
showInstructionMessage();