/* Fuel & Lift — calorie, macro and gym tracker. Vanilla JS, localStorage, EN/ES. */
(() => {
  'use strict';

  /* =========================== Helpers =========================== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); };
  const round = (n, p = 0) => { const f = 10 ** p; return Math.round((Number(n) || 0) * f) / f; };
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const num = (v, fallback = 0) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : fallback; };
  const norm = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const cap = (v) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : v);
  const fmtDur = (ms) => { const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`; };

  const TEST = !!window.__FUEL_LIFT_TEST; // set by tests/*.html: no audio, no service worker, internals exposed on window.__FL
  let toastTimer;
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), 2200);
  }

  /* =========================== i18n =========================== */
  const ES = {
    // nav / general
    'Today': 'Hoy', 'Foods': 'Alimentos', 'Gym': 'Gimnasio', 'Progress': 'Progreso', 'Settings': 'Ajustes',
    'Yesterday': 'Ayer', 'Tomorrow': 'Mañana', 'Cancel': 'Cancelar', 'Delete': 'Eliminar', 'Save': 'Guardar', 'Add': 'Agregar',
    'Data is stored locally in this browser.': 'Los datos se guardan solo en este navegador.',
    // today
    'eaten': 'comidas', 'Goal': 'Meta', 'Remaining': 'Restantes', 'Over': 'De más', 'of goal': 'de la meta',
    'Protein': 'Proteína', 'Carbs': 'Carbos', 'Fat': 'Grasa', 'kcal': 'kcal',
    'Breakfast': 'Desayuno', 'Lunch': 'Almuerzo', 'Dinner': 'Cena', 'Snacks': 'Colaciones',
    'Add food': 'Agregar alimento', 'Previous day': 'Día anterior', 'Next day': 'Día siguiente', 'Remove': 'Quitar',
    // add food
    'Add to {meal}': 'Agregar a {meal}', 'Search foods…': 'Buscar alimentos…', 'Recent': 'Recientes', 'Suggestions': 'Sugerencias',
    '{n} result': '{n} resultado', '{n} results': '{n} resultados', 'No foods match “{q}”': 'Nada coincide con “{q}”',
    'Create it below and it will be saved to your library.': 'Créalo abajo y quedará guardado en tu biblioteca.', 'Or create it below.': 'O créalo abajo.',
    'Look up barcode {code}': 'Buscar código {code}', 'Searches Open Food Facts': 'Busca en Open Food Facts', 'per 100 g': 'por 100 g',
    'Create new food': 'Crear alimento', 'Scan barcode': 'Escanear código', 'Amount': 'Cantidad', '1 serving': '1 porción',
    'Add {n} kcal': 'Agregar {n} kcal', 'Enter an amount': 'Ingresa una cantidad', 'Added {name}': 'Agregado: {name}',
    // food form
    'Edit food': 'Editar alimento', 'New food': 'Nuevo alimento', 'Barcode': 'Código de barras', 'Rescan': 'Escanear de nuevo',
    'Name': 'Nombre', 'e.g. Oat milk': 'ej. Leche de avena', 'Serving size (optional)': 'Tamaño de porción (opcional)', 'e.g. 250': 'ej. 250',
    'Nutrition values are per': 'Los valores nutricionales son por', '100 g': '100 g', 'Protein g': 'Proteína g', 'Carbs g': 'Carbos g', 'Fat g': 'Grasa g',
    'Give the food a name': 'Ponle un nombre al alimento', 'Enter a serving size first': 'Primero ingresa el tamaño de porción', 'Food saved': 'Alimento guardado',
    'Delete food?': '¿Eliminar alimento?', 'Logged meals keep their values; only the library entry is removed.': 'Las comidas registradas conservan sus valores; solo se quita de la biblioteca.',
    'Food deleted': 'Alimento eliminado',
    // foods
    '{n} foods in your library': '{n} alimentos en tu biblioteca', 'Scan': 'Escanear', 'Search library…': 'Buscar en la biblioteca…', 'custom': 'propio',
    'serving {n} g': 'porción {n} g', 'kcal/100g': 'kcal/100g', 'Nothing found': 'Nada por aquí', 'Try another name or create a new food.': 'Prueba otro nombre o crea un alimento.',
    // gym
    '{n} workouts in the last 7 days': '{n} entrenamientos en los últimos 7 días', 'Empty workout': 'Entreno libre', 'Routines': 'Rutinas', 'New routine': 'Nueva rutina',
    'No routines yet': 'Aún no hay rutinas', 'Create one to start logging faster.': 'Crea una para registrar más rápido.', 'History': 'Historial',
    'No workouts yet': 'Aún no hay entrenamientos', 'Finish a workout and it will show up here.': 'Termina un entrenamiento y aparecerá aquí.',
    '{n} exercises': '{n} ejercicios', 'last {day}': 'último: {day}', 'Start workout': 'Empezar', 'Edit routine': 'Editar rutina', 'sets': 'series', 'no sets': 'sin series',
    'Repeat': 'Repetir', 'Workout': 'Entrenamiento', 'Started {time}': 'Inicio {time}', 'Finish': 'Terminar', 'target {reps} reps': 'objetivo {reps} reps',
    'Remove exercise': 'Quitar ejercicio', 'Set': 'Serie', 'Previous': 'Anterior', 'Reps': 'Reps', 'BW': 'PC', 'Mark set done': 'Marcar serie',
    'Add set': 'Agregar serie', 'Remove set': 'Quitar serie', 'Add exercise': 'Agregar ejercicio', 'Discard workout': 'Descartar entrenamiento',
    'Mark at least one set as done': 'Marca al menos una serie', 'Workout saved · {n} sets · {v} {u} lifted': 'Guardado · {n} series · {v} {u} levantados',
    'Rest {t}': 'Descanso {t}', 'Skip': 'Saltar', 'Rest over — next set': 'Fin del descanso, ¡siguiente serie!',
    'Delete workout?': '¿Eliminar entrenamiento?', 'This removes it from your history.': 'Se quitará del historial.',
    'Discard workout?': '¿Descartar entrenamiento?', 'Nothing from this session will be saved.': 'No se guardará nada de esta sesión.', 'Discard': 'Descartar',
    // routine editor
    'e.g. Upper A': 'ej. Torso A', 'Exercises': 'Ejercicios', 'reps': 'reps',
    'No exercises yet. Tap “Add” to pick from the library.': 'Sin ejercicios. Toca “Agregar” para elegir de la lista.', 'Save routine': 'Guardar rutina',
    'Name your routine': 'Ponle nombre a la rutina', 'Add at least one exercise': 'Agrega al menos un ejercicio', 'Routine saved': 'Rutina guardada',
    'Delete routine?': '¿Eliminar rutina?', 'Past workouts are kept.': 'Los entrenamientos pasados se conservan.',
    'Choose exercise': 'Elegir ejercicio', 'Search by name or muscle…': 'Buscar por nombre o músculo…', 'Create “{q}”': 'Crear “{q}”', 'No exercises match.': 'Ningún ejercicio coincide.',
    'Chest': 'Pecho', 'Shoulders': 'Hombros', 'Back': 'Espalda', 'Legs': 'Piernas', 'Arms': 'Brazos', 'Core': 'Core', 'Cardio': 'Cardio', 'Other': 'Otro',
    'Push': 'Empuje', 'Pull': 'Tirón',
    // progress
    'Trends over the last weeks': 'Tendencias de las últimas semanas', 'Body weight': 'Peso corporal', '{d} {u} in 30 days': '{d} {u} en 30 días',
    'Log weight to see trend': 'Registra tu peso para ver la tendencia', 'Avg. calories (7d)': 'Prom. calorías (7d)', '{d} vs goal': '{d} vs meta', 'No days logged': 'Sin días registrados',
    'Workouts (7d)': 'Entrenamientos (7d)', '{n} total': '{n} en total', 'last 90 days': 'últimos 90 días', 'Today’s weight': 'Peso de hoy', 'Update': 'Actualizar', 'Log': 'Registrar',
    'One entry so far': 'Solo un registro por ahora', 'No weight logged yet': 'Aún no registras tu peso', 'Log a couple of days to see the trend line.': 'Registra un par de días para ver la línea de tendencia.',
    'Calories': 'Calorías', 'last 14 days': 'últimos 14 días', 'Eaten': 'Comidas', 'Goal {n}': 'Meta {n}', 'Personal bests': 'Récords personales', 'not logged': 'sin registro',
    'Body weight over time': 'Peso corporal en el tiempo', 'Calories per day': 'Calorías por día', 'Enter your weight': 'Ingresa tu peso', 'Weight logged': 'Peso registrado',
    // settings
    'Goals, units and your data': 'Metas, unidades y tus datos', 'Daily goals': 'Metas diarias', 'Macros add up to {n} kcal.': 'Los macros suman {n} kcal.',
    'Calculate from my profile': 'Calcular según mi perfil', 'Sex': 'Sexo', 'Male': 'Hombre', 'Female': 'Mujer', 'Age': 'Edad', 'Height cm': 'Estatura cm', 'Weight {u}': 'Peso {u}',
    'Activity': 'Actividad', 'Sedentary': 'Sedentario', 'Light (1-3 d/wk)': 'Ligera (1-3 d/sem)', 'Moderate (3-5 d/wk)': 'Moderada (3-5 d/sem)', 'Active (6-7 d/wk)': 'Activa (6-7 d/sem)', 'Very active': 'Muy activa',
    'Lose fat (−500)': 'Bajar grasa (−500)', 'Maintain': 'Mantener', 'Build muscle (+300)': 'Ganar músculo (+300)', 'Estimate:': 'Estimación:', 'Use these goals': 'Usar estas metas',
    'Preferences': 'Preferencias', 'Weight units': 'Unidad de peso', 'For body weight and lifts': 'Para peso corporal y cargas', 'Rest timer': 'Temporizador de descanso',
    'Starts when you check a set. 0 to disable.': 'Empieza al marcar una serie. 0 para desactivar.', 'sec': 'seg', 'Theme': 'Tema', 'Auto': 'Auto', 'Light': 'Claro', 'Dark': 'Oscuro',
    'Language': 'Idioma', 'Data': 'Datos', 'Everything lives in this browser. Export regularly to keep a backup or move devices.': 'Todo vive en este navegador. Exporta de vez en cuando para tener respaldo o cambiar de equipo.',
    'Export JSON': 'Exportar JSON', 'Import JSON': 'Importar JSON', 'Reset all data': 'Borrar todo', 'Goals updated': 'Metas actualizadas',
    'Reset all data?': '¿Borrar todos los datos?', 'Foods, logs, routines and workouts will be erased. Export first if you want a backup.': 'Se borrarán alimentos, registros, rutinas y entrenamientos. Exporta antes si quieres un respaldo.',
    'Reset': 'Borrar', 'Data reset': 'Datos borrados', 'Import this backup?': '¿Importar este respaldo?', 'Replaces current data with {d} logged days and {w} workouts.': 'Reemplaza los datos actuales por {d} días registrados y {w} entrenamientos.',
    'Import': 'Importar', 'Data imported': 'Datos importados', 'That file is not a valid backup': 'Ese archivo no es un respaldo válido',
    // scanner
    'Point the camera at the barcode': 'Apunta la cámara al código de barras', 'Or type the number under the barcode': 'O escribe el número bajo el código', 'Look up': 'Buscar',
    'Products are looked up on Open Food Facts. If one is missing, type the label values and it is saved with the barcode for next time.': 'Los productos se buscan en Open Food Facts. Si falta alguno, escribe los valores de la etiqueta y quedará guardado con el código para la próxima.',
    'No camera available here. Type the number instead.': 'No hay cámara disponible. Escribe el número.', 'The camera needs HTTPS or localhost. Type the number instead.': 'La cámara requiere HTTPS o localhost. Escribe el número.',
    'No camera found on this device. Type the number instead.': 'Este equipo no tiene cámara. Escribe el número.', 'Loading scanner…': 'Cargando escáner…',
    'Camera permission denied. Type the number instead.': 'Permiso de cámara denegado. Escribe el número.', 'Could not start the camera. Type the number instead.': 'No se pudo iniciar la cámara. Escribe el número.',
    'That does not look like a product barcode.': 'Eso no parece un código de producto.', 'Looking up {code}…': 'Buscando {code}…', 'Found {name} in your library': '{name} ya está en tu biblioteca',
    'Not in Open Food Facts yet. Enter the values from the label; they will be saved with this barcode.': 'Aún no está en Open Food Facts. Ingresa los valores de la etiqueta; se guardarán con este código.',
    'Calories are missing in the database. Copy them from the label.': 'Faltan las calorías en la base de datos. Cópialas de la etiqueta.',
    'Found on Open Food Facts. Check the values against the label, then save.': 'Encontrado en Open Food Facts. Revisa los valores con la etiqueta y guarda.',
    'Could not reach Open Food Facts. Check your connection and try again.': 'No se pudo conectar con Open Food Facts. Revisa tu conexión e intenta de nuevo.',
    // account / sync
    'Account': 'Cuenta', 'Your log, foods, routines and workouts follow you on every device where you sign in.': 'Tu registro, alimentos, rutinas y entrenamientos te siguen en todos los dispositivos donde inicies sesión.',
    'Cloud sync is not set up for this copy of the app. See the README to connect a Firebase project.': 'La sincronización en la nube no está configurada en esta copia de la app. Mira el README para conectar un proyecto de Firebase.',
    'Loading…': 'Cargando…', 'Email': 'Correo', 'Password': 'Contraseña', 'Sign in': 'Iniciar sesión', 'Create account': 'Crear cuenta', 'Forgot password?': '¿Olvidaste tu contraseña?',
    'Sign out': 'Cerrar sesión', 'Signed in as {email}': 'Sesión iniciada como {email}', 'Synced': 'Sincronizado', 'Syncing…': 'Sincronizando…',
    'Offline. Changes will sync when you are back online.': 'Sin conexión. Los cambios se sincronizarán al reconectar.', 'Sync error: {msg}': 'Error de sincronización: {msg}',
    'Enter your email and password': 'Ingresa tu correo y contraseña', 'Password must be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
    'Enter your email first': 'Primero ingresa tu correo', 'Password reset email sent': 'Te enviamos un correo para restablecer la contraseña',
    'Welcome back!': '¡Hola de nuevo!', 'Account created': 'Cuenta creada', 'Signed out': 'Sesión cerrada',
    'Wrong email or password': 'Correo o contraseña incorrectos', 'That email is already registered': 'Ese correo ya está registrado', 'That email looks invalid': 'Ese correo no parece válido',
    'Too many attempts, try again later': 'Demasiados intentos, prueba más tarde', 'Network error, check your connection': 'Error de red, revisa tu conexión',
    'Could not load the sync module': 'No se pudo cargar el módulo de sincronización', 'Permission denied (check the Firestore rules)': 'Permiso denegado (revisa las reglas de Firestore)',
    'Which data should we keep?': '¿Qué datos conservamos?',
    'This device already has data, and your account also has data in the cloud. Pick one; the other copy is replaced.': 'Este dispositivo ya tiene datos y tu cuenta también tiene datos en la nube. Elige uno; la otra copia se reemplaza.',
    'Use cloud data': 'Usar los datos de la nube', 'Use this device’s data': 'Usar los datos de este dispositivo',
    'This device only. Your cloud data is kept; sign in again to get it back.': 'Solo este dispositivo. Tus datos en la nube se conservan; vuelve a iniciar sesión para recuperarlos.',
    // v3
    'Copy from {day}': 'Copiar de {day}', 'Copied {n} items': 'Copiados {n} alimentos', 'Save as meal': 'Guardar comida', 'Saved meals': 'Comidas guardadas',
    'Name this meal': 'Nombre de la comida', 'e.g. Usual breakfast': 'ej. Desayuno de siempre', 'Meal saved': 'Comida guardada', '{n} items': '{n} alimentos',
    'Delete saved meal?': '¿Eliminar comida guardada?', 'Edit amount': 'Editar cantidad', 'Updated': 'Actualizado',
    'Search Open Food Facts for “{q}”': 'Buscar “{q}” en Open Food Facts', 'Searching Open Food Facts…': 'Buscando en Open Food Facts…', 'Open Food Facts': 'Open Food Facts',
    'No products found on Open Food Facts': 'No hay productos en Open Food Facts', 'Could not reach Open Food Facts': 'No se pudo conectar con Open Food Facts',
    'Move up': 'Subir', 'Move down': 'Bajar', 'Daily': 'Diario', '7-day average': 'Promedio 7 días', 'Lifts': 'Cargas', 'Top set weight per session': 'Peso máximo por sesión',
    'Log the same exercise in two sessions to see its trend.': 'Registra el mismo ejercicio en dos sesiones para ver su tendencia.', 'No lifts with weight yet': 'Aún no hay cargas registradas',
    'New version available': 'Hay una versión nueva', 'Reload': 'Recargar', 'Items': 'Alimentos',
    'Your name': 'Tu nombre', 'e.g. David': 'ej. David', 'Shown in the greeting and on your account': 'Aparece en el saludo y en tu cuenta',
    'Good morning, {name}': 'Buenos días, {name}', 'Good afternoon, {name}': 'Buenas tardes, {name}', 'Good evening, {name}': 'Buenas noches, {name}',
    'Open settings': 'Abrir ajustes',
  };
  const FOOD_ES = {
    'Chicken breast, cooked': 'Pechuga de pollo, cocida', 'Turkey breast': 'Pechuga de pavo', 'Beef, lean, cooked': 'Carne de vacuno magra, cocida', 'Pork chop, cooked': 'Chuleta de cerdo, cocida',
    'Salmon, cooked': 'Salmón, cocido', 'Tuna, canned in water': 'Atún en agua', 'Cod / white fish': 'Merluza / pescado blanco', 'Shrimp': 'Camarones', 'Egg, whole': 'Huevo entero',
    'Egg whites': 'Claras de huevo', 'Greek yogurt, plain': 'Yogur griego natural', 'Cottage cheese': 'Queso cottage', 'Whole milk': 'Leche entera', 'Skim milk': 'Leche descremada',
    'Cheddar cheese': 'Queso cheddar', 'Whey protein powder': 'Proteína whey en polvo', 'Protein bar': 'Barra de proteína', 'Tofu, firm': 'Tofu firme', 'Lentils, cooked': 'Lentejas, cocidas',
    'Black beans, cooked': 'Porotos negros, cocidos', 'Chickpeas, cooked': 'Garbanzos, cocidos', 'White rice, cooked': 'Arroz blanco, cocido', 'Brown rice, cooked': 'Arroz integral, cocido',
    'Quinoa, cooked': 'Quinoa, cocida', 'Pasta, cooked': 'Pasta, cocida', 'Oats, dry': 'Avena, cruda', 'Whole wheat bread': 'Pan integral', 'White bread': 'Pan blanco',
    'Corn tortilla': 'Tortilla de maíz', 'Potato, boiled': 'Papa, cocida', 'Sweet potato, baked': 'Camote, al horno', 'Banana': 'Plátano', 'Apple': 'Manzana', 'Orange': 'Naranja',
    'Strawberries': 'Frutillas', 'Blueberries': 'Arándanos', 'Avocado': 'Palta', 'Broccoli': 'Brócoli', 'Spinach, raw': 'Espinaca, cruda', 'Mixed salad greens': 'Mix de hojas verdes',
    'Tomato': 'Tomate', 'Carrot': 'Zanahoria', 'Olive oil': 'Aceite de oliva', 'Butter': 'Mantequilla', 'Peanut butter': 'Mantequilla de maní', 'Almonds': 'Almendras', 'Walnuts': 'Nueces',
    'Hummus': 'Hummus', 'Honey': 'Miel', 'Dark chocolate 70%': 'Chocolate amargo 70%', 'Pizza, cheese': 'Pizza de queso', 'Cheeseburger': 'Hamburguesa con queso', 'French fries': 'Papas fritas',
    'Orange juice': 'Jugo de naranja', 'Cola': 'Bebida cola', 'Beer': 'Cerveza', 'Red wine': 'Vino tinto',
  };
  const EX_ES = {
    'Bench Press': 'Press de banca', 'Incline Dumbbell Press': 'Press inclinado con mancuernas', 'Push-Up': 'Flexiones', 'Cable Fly': 'Aperturas en polea', 'Dips': 'Fondos',
    'Overhead Press': 'Press militar', 'Lateral Raise': 'Elevaciones laterales', 'Face Pull': 'Face pull', 'Rear Delt Fly': 'Pájaros (deltoide posterior)',
    'Pull-Up': 'Dominadas', 'Lat Pulldown': 'Jalón al pecho', 'Barbell Row': 'Remo con barra', 'Seated Cable Row': 'Remo en polea sentado', 'Dumbbell Row': 'Remo con mancuerna', 'Deadlift': 'Peso muerto',
    'Squat': 'Sentadilla', 'Front Squat': 'Sentadilla frontal', 'Leg Press': 'Prensa de piernas', 'Leg Extension': 'Extensión de cuádriceps', 'Bulgarian Split Squat': 'Sentadilla búlgara', 'Lunges': 'Zancadas',
    'Romanian Deadlift': 'Peso muerto rumano', 'Leg Curl': 'Curl femoral', 'Hip Thrust': 'Hip thrust', 'Calf Raise': 'Elevación de talones',
    'Barbell Curl': 'Curl con barra', 'Dumbbell Curl': 'Curl con mancuernas', 'Hammer Curl': 'Curl martillo', 'Triceps Pushdown': 'Extensión de tríceps en polea', 'Skull Crusher': 'Press francés', 'Overhead Triceps Extension': 'Extensión de tríceps sobre la cabeza',
    'Plank': 'Plancha', 'Hanging Leg Raise': 'Elevación de piernas colgado', 'Cable Crunch': 'Crunch en polea', 'Ab Wheel Rollout': 'Rueda abdominal',
    'Treadmill Run': 'Trotadora', 'Cycling': 'Bicicleta', 'Rowing Machine': 'Remo (máquina)', 'Jump Rope': 'Saltar la cuerda',
  };
  const lang = () => state.settings.lang;
  const t = (key, vars) => {
    let s = lang() === 'es' ? (ES[key] ?? key) : key;
    if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
    return s;
  };
  const locale = () => (lang() === 'es' ? 'es-CL' : 'en-US');
  const fmtInt = (n) => Math.round(n).toLocaleString(locale());
  const fmtDate = (k, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => cap(parseKey(k).toLocaleDateString(locale(), opts));
  const relDay = (k) => { const td = dateKey(); if (k === td) return t('Today'); if (k === addDays(td, -1)) return t('Yesterday'); if (k === addDays(td, 1)) return t('Tomorrow'); return fmtDate(k); };
  const userName = () => String(state.settings.profile.name || '').trim();
  const greeting = () => { const n = userName(); if (!n) return ''; const h = new Date().getHours(); return t(h < 12 ? 'Good morning, {name}' : h < 19 ? 'Good afternoon, {name}' : 'Good evening, {name}', { name: esc(n) }); };
  const avatar = () => { const n = userName(); return n ? `<button class="avatar" data-action="tab" data-tab="settings" aria-label="${t('Open settings')}" title="${esc(n)}">${esc(n.charAt(0).toUpperCase())}</button>` : ''; };
  // Display names for built-in data (translated while the item is untouched)
  const foodName = (f) => (lang() === 'es' && f.builtin && FOOD_ES[f.name]) || f.name;
  const exName = (e) => (lang() === 'es' && e.builtin && EX_ES[e.name]) || e.name;
  const muscleName = (m) => t(m);
  const routineName = (r) => (lang() === 'es' && /^r_(push|pull|legs)$/.test(r.id) && ['Push', 'Pull', 'Legs'].includes(r.name) ? t(r.name) : r.name);
  const matches = (shown, raw, s) => norm(shown).includes(s) || norm(raw).includes(s);

  /* =========================== Seed data =========================== */
  // Per 100 g: kcal, protein, carbs, fat. serving = grams of one typical portion.
  const SEED_FOODS = [
    ['Chicken breast, cooked', 165, 31, 0, 3.6, 120], ['Turkey breast', 135, 30, 0, 1, 100], ['Beef, lean, cooked', 250, 26, 0, 15, 150],
    ['Pork chop, cooked', 231, 25, 0, 14, 150], ['Salmon, cooked', 208, 20, 0, 13, 150], ['Tuna, canned in water', 116, 26, 0, 1, 120],
    ['Cod / white fish', 82, 18, 0, 0.7, 150], ['Shrimp', 99, 24, 0.2, 0.3, 100], ['Egg, whole', 155, 13, 1.1, 11, 50],
    ['Egg whites', 52, 11, 0.7, 0.2, 33], ['Greek yogurt, plain', 59, 10, 3.6, 0.4, 170], ['Cottage cheese', 98, 11, 3.4, 4.3, 150],
    ['Whole milk', 61, 3.2, 4.8, 3.3, 250], ['Skim milk', 34, 3.4, 5, 0.1, 250], ['Cheddar cheese', 403, 25, 1.3, 33, 28],
    ['Whey protein powder', 400, 80, 8, 6, 30], ['Protein bar', 380, 30, 40, 12, 60], ['Tofu, firm', 76, 8, 1.9, 4.8, 100],
    ['Lentils, cooked', 116, 9, 20, 0.4, 200], ['Black beans, cooked', 132, 8.9, 24, 0.5, 170], ['Chickpeas, cooked', 164, 8.9, 27, 2.6, 160],
    ['White rice, cooked', 130, 2.7, 28, 0.3, 180], ['Brown rice, cooked', 123, 2.7, 26, 1, 180], ['Quinoa, cooked', 120, 4.4, 21, 1.9, 185],
    ['Pasta, cooked', 158, 5.8, 31, 0.9, 200], ['Oats, dry', 389, 17, 66, 7, 40], ['Whole wheat bread', 247, 13, 41, 3.4, 32],
    ['White bread', 265, 9, 49, 3.2, 30], ['Corn tortilla', 218, 5.7, 45, 2.9, 26], ['Potato, boiled', 87, 1.9, 20, 0.1, 200],
    ['Sweet potato, baked', 90, 2, 21, 0.1, 150], ['Banana', 89, 1.1, 23, 0.3, 118], ['Apple', 52, 0.3, 14, 0.2, 180],
    ['Orange', 47, 0.9, 12, 0.1, 130], ['Strawberries', 32, 0.7, 7.7, 0.3, 150], ['Blueberries', 57, 0.7, 14, 0.3, 100],
    ['Avocado', 160, 2, 9, 15, 100], ['Broccoli', 34, 2.8, 7, 0.4, 150], ['Spinach, raw', 23, 2.9, 3.6, 0.4, 60],
    ['Mixed salad greens', 20, 1.5, 3.5, 0.3, 80], ['Tomato', 18, 0.9, 3.9, 0.2, 120], ['Carrot', 41, 0.9, 10, 0.2, 60],
    ['Olive oil', 884, 0, 0, 100, 14], ['Butter', 717, 0.9, 0.1, 81, 14], ['Peanut butter', 588, 25, 20, 50, 16],
    ['Almonds', 579, 21, 22, 50, 28], ['Walnuts', 654, 15, 14, 65, 28], ['Hummus', 166, 8, 14, 9.6, 30],
    ['Honey', 304, 0.3, 82, 0, 21], ['Dark chocolate 70%', 598, 7.8, 46, 43, 20], ['Pizza, cheese', 266, 11, 33, 10, 107],
    ['Cheeseburger', 295, 17, 24, 14, 220], ['French fries', 312, 3.4, 41, 15, 120], ['Orange juice', 45, 0.7, 10, 0.2, 250],
    ['Cola', 42, 0, 10.6, 0, 330], ['Beer', 43, 0.5, 3.6, 0, 330], ['Red wine', 85, 0.1, 2.6, 0, 150],
  ].map(([name, kcal, p, c, f, serving]) => ({ id: 'f_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name, kcal, p, c, f, serving, builtin: true }));

  const SEED_EXERCISES = [
    ['Bench Press', 'Chest'], ['Incline Dumbbell Press', 'Chest'], ['Push-Up', 'Chest'], ['Cable Fly', 'Chest'], ['Dips', 'Chest'],
    ['Overhead Press', 'Shoulders'], ['Lateral Raise', 'Shoulders'], ['Face Pull', 'Shoulders'], ['Rear Delt Fly', 'Shoulders'],
    ['Pull-Up', 'Back'], ['Lat Pulldown', 'Back'], ['Barbell Row', 'Back'], ['Seated Cable Row', 'Back'], ['Dumbbell Row', 'Back'], ['Deadlift', 'Back'],
    ['Squat', 'Legs'], ['Front Squat', 'Legs'], ['Leg Press', 'Legs'], ['Leg Extension', 'Legs'], ['Bulgarian Split Squat', 'Legs'], ['Lunges', 'Legs'],
    ['Romanian Deadlift', 'Legs'], ['Leg Curl', 'Legs'], ['Hip Thrust', 'Legs'], ['Calf Raise', 'Legs'],
    ['Barbell Curl', 'Arms'], ['Dumbbell Curl', 'Arms'], ['Hammer Curl', 'Arms'], ['Triceps Pushdown', 'Arms'], ['Skull Crusher', 'Arms'], ['Overhead Triceps Extension', 'Arms'],
    ['Plank', 'Core'], ['Hanging Leg Raise', 'Core'], ['Cable Crunch', 'Core'], ['Ab Wheel Rollout', 'Core'],
    ['Treadmill Run', 'Cardio'], ['Cycling', 'Cardio'], ['Rowing Machine', 'Cardio'], ['Jump Rope', 'Cardio'],
  ].map(([name, muscle]) => ({ id: 'e_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name, muscle, builtin: true }));
  const exId = (name) => 'e_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

  const SEED_ROUTINES = [
    { id: 'r_push', name: 'Push', exercises: [[exId('Bench Press'), 4, '8-10'], [exId('Incline Dumbbell Press'), 3, '10-12'], [exId('Overhead Press'), 3, '8-10'], [exId('Lateral Raise'), 3, '12-15'], [exId('Triceps Pushdown'), 3, '12']] },
    { id: 'r_pull', name: 'Pull', exercises: [[exId('Deadlift'), 3, '5'], [exId('Pull-Up'), 3, '8'], [exId('Barbell Row'), 3, '8-10'], [exId('Face Pull'), 3, '15'], [exId('Barbell Curl'), 3, '10-12']] },
    { id: 'r_legs', name: 'Legs', exercises: [[exId('Squat'), 4, '6-8'], [exId('Romanian Deadlift'), 3, '8-10'], [exId('Leg Press'), 3, '10-12'], [exId('Leg Curl'), 3, '12'], [exId('Calf Raise'), 4, '12-15'], [exId('Plank'), 3, '60s']] },
  ].map((r) => ({ ...r, exercises: r.exercises.map(([exId, sets, reps]) => ({ exId, sets, reps })) }));

  const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snacks', 'Snacks']];
  const mealLabel = (key) => t(MEALS.find(([k]) => k === key)[1]);

  const defaultState = () => ({
    version: 1,
    settings: {
      theme: 'system', units: 'kg', restSeconds: 90, lang: (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en',
      goals: { kcal: 2200, p: 150, c: 240, f: 70 },
      profile: { name: '', sex: 'male', age: 28, height: 178, weight: 78, activity: 1.55, goal: 'maintain' },
    },
    foods: SEED_FOODS.map((f) => ({ ...f })),            // fresh copies: the seeds must never be mutated
    exercises: SEED_EXERCISES.map((e) => ({ ...e })),
    routines: JSON.parse(JSON.stringify(SEED_ROUTINES)),
    meals: [],       // saved meals: { id, name, items: [entry-like] }
    logs: {},        // dateKey -> { breakfast: [entry], ... }
    weights: [],     // { date, kg }
    workouts: [],    // completed
    activeWorkout: null,
  });

  /* =========================== Store =========================== */
  const KEY = 'fuel-lift-v1';
  let state = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const s = JSON.parse(raw);
      const d = defaultState();
      return { ...d, ...s, settings: { ...d.settings, ...s.settings, goals: { ...d.settings.goals, ...(s.settings?.goals || {}) }, profile: { ...d.settings.profile, ...(s.settings?.profile || {}) } } };
    } catch { return defaultState(); }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); syncDetectChanges(); }

  /* =========================== Units =========================== */
  const KG_LB = 2.2046226218;
  const unit = () => state.settings.units;
  const toDisplayW = (kg) => kg == null || kg === '' ? '' : round(unit() === 'lb' ? kg * KG_LB : kg, 1);
  const fromDisplayW = (v) => { const n = num(v, NaN); if (!Number.isFinite(n)) return null; return unit() === 'lb' ? n / KG_LB : n; };

  /* =========================== Icons =========================== */
  const I = {
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a9 9 0 1 0 9 9"/><path d="M12 7v5l3 2"/><path d="M17 3l4 4"/><path d="M21 3v4h-4"/></svg>',
    foods: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8c0 5-4 9-6 11-2-2-6-6-6-11a6 6 0 0 1 12 0z"/><path d="M12 2c1 1.5 1 3 0 4"/></svg>',
    gym: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5v14"/><path d="M18 5v14"/><path d="M3 8v8"/><path d="M21 8v8"/><path d="M6 12h12"/></svg>',
    progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>',
    scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M11 8v8M14 8v8M17 8v8"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.4 6.3 20.5l1.2-6.4L2.8 9.7l6.4-.8z"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  };

  /* =========================== App state (UI) =========================== */
  const ui = { tab: 'today', date: dateKey(), foodSearch: '', modal: null };

  const TABS = [['today', 'Today', I.today], ['foods', 'Foods', I.foods], ['gym', 'Gym', I.gym], ['progress', 'Progress', I.progress], ['settings', 'Settings', I.settings]];

  function applyTheme() {
    const th = state.settings.theme;
    if (th === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', th);
    const dark = th === 'dark' || (th === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    $('meta[name=theme-color]').setAttribute('content', dark ? '#0f1115' : '#f4f5f8');
  }
  function applyLang() {
    document.documentElement.lang = lang();
    const foot = $('#sidebar-foot'); if (foot) foot.innerHTML = (userName() ? `<div class="row" style="gap:8px;margin-bottom:8px;color:var(--text)">${avatar()}<span style="font-weight:600">${esc(userName())}</span></div>` : '') + t('Data is stored locally in this browser.');
  }

  function renderNav() {
    const html = TABS.map(([id, label, icon]) => `<button class="${ui.tab === id ? 'active' : ''}" data-action="tab" data-tab="${id}" aria-current="${ui.tab === id ? 'page' : 'false'}">${icon}<span>${t(label)}</span></button>`).join('');
    $('#nav-side').innerHTML = html; $('#nav-bottom').innerHTML = html;
  }

  function render() {
    applyLang();
    renderNav();
    const main = $('#main');
    const views = { today: viewToday, foods: viewFoods, gym: viewGym, progress: viewProgress, settings: viewSettings };
    main.innerHTML = views[ui.tab]();
    afterRender();
  }
  function afterRender() {
    if (ui.tab === 'progress') wireCharts();
    if (ui.tab === 'gym' && state.activeWorkout) startElapsed(); else stopElapsed();
  }

  /* =========================== Nutrition helpers =========================== */
  const dayLog = (k = ui.date) => state.logs[k] || {};
  const dayEntries = (k) => MEALS.flatMap(([m]) => (dayLog(k)[m] || []));
  const sumMacros = (entries) => entries.reduce((a, e) => ({ kcal: a.kcal + e.kcal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const macrosFor = (food, grams) => ({ kcal: food.kcal * grams / 100, p: food.p * grams / 100, c: food.c * grams / 100, f: food.f * grams / 100 });
  const recentFoodIds = () => {
    const seen = []; const keys = Object.keys(state.logs).sort().reverse().slice(0, 14);
    for (const k of keys) for (const e of dayEntries(k)) if (e.foodId && !seen.includes(e.foodId)) seen.push(e.foodId);
    return seen.slice(0, 8);
  };
  const prevDayWith = (meal) => { const keys = Object.keys(state.logs).filter((k) => k < ui.date && (state.logs[k][meal] || []).length).sort(); return keys[keys.length - 1] || null; };
  const entryFood = (e) => { const g = e.grams > 0 ? e.grams : 100; return { id: 'entry', name: e.name, kcal: e.kcal / g * 100, p: e.p / g * 100, c: e.c / g * 100, f: e.f / g * 100, serving: null, builtin: false }; };
  const modalFood = (m) => state.foods.find((x) => x.id === m.foodId) || (m.entry ? entryFood(m.entry) : null);
  const macroDots = (f) => `<span class="macro-dots"><span class="p"><i></i>${round(f.p)}</span><span class="c"><i></i>${round(f.c)}</span><span class="f"><i></i>${round(f.f)}</span></span>`;

  /* =========================== TODAY =========================== */
  function viewToday() {
    const g = state.settings.goals;
    const tot = sumMacros(dayEntries(ui.date));
    const pct = g.kcal ? tot.kcal / g.kcal : 0;
    const r = 64, circ = 2 * Math.PI * r;
    const remaining = g.kcal - tot.kcal;
    const macro = (key, label, cls) => {
      const v = tot[key], goal = g[key];
      return `<div class="macro ${cls}"><div class="top"><b>${t(label)}</b><span>${fmtInt(v)} / ${goal} g</span></div><div class="meter"><i style="width:${clamp(goal ? v / goal * 100 : 0, 0, 100)}%"></i></div></div>`;
    };
    const mealHtml = MEALS.map(([m, label]) => {
      const entries = dayLog()[m] || [];
      const sub = sumMacros(entries);
      return `<div class="card meal">
        <div class="meal-head"><h2>${t(label)}</h2><span class="kcal">${entries.length ? fmtInt(sub.kcal) + ' kcal' : ''}</span></div>
        <div class="list">${entries.map((e) => `
          <div class="list-item clickable" data-action="entry-edit" data-meal="${m}" data-id="${e.id}">
            <div class="grow"><div class="title">${esc(e.name)}</div><div class="sub">${round(e.grams)} g · ${macroDots(e)}</div></div>
            <div class="val">${fmtInt(e.kcal)}</div>
            <button class="icon-btn danger" data-action="entry-remove" data-meal="${m}" data-id="${e.id}" aria-label="${t('Remove')}">${I.x}</button>
          </div>`).join('')}</div>
        <div class="add-row row wrap"><button class="btn ghost sm" data-action="add-food" data-meal="${m}">${I.plus} ${t('Add food')}</button>${!entries.length && prevDayWith(m) ? `<button class="btn ghost sm" data-action="copy-meal" data-meal="${m}" data-from="${prevDayWith(m)}">${I.copy} ${t('Copy from {day}', { day: relDay(prevDayWith(m)) })}</button>` : ''}${entries.length ? `<button class="btn ghost sm" data-action="save-meal" data-meal="${m}">${I.star} ${t('Save as meal')}</button>` : ''}</div>
      </div>`;
    }).join('');

    return `
      <div class="page-head">
        <div><h1>${relDay(ui.date)}</h1><div class="sub">${ui.date === dateKey() && greeting() ? greeting() + ' · ' : ''}${fmtDate(ui.date, { weekday: 'long', month: 'long', day: 'numeric' })}</div></div>
        <div class="date-nav">${avatar()}
          <button class="icon-btn" data-action="date" data-n="-1" aria-label="${t('Previous day')}">${I.left}</button>
          ${ui.date !== dateKey() ? `<button class="btn ghost sm" data-action="date-today">${t('Today')}</button>` : ''}
          <button class="icon-btn" data-action="date" data-n="1" aria-label="${t('Next day')}">${I.right}</button>
        </div>
      </div>
      <div class="card">
        <div class="kcal-card">
          <div class="ring">
            <svg viewBox="0 0 150 150"><circle class="track" cx="75" cy="75" r="${r}"/><circle class="bar ${pct > 1 ? 'over' : ''}" cx="75" cy="75" r="${r}" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - clamp(pct, 0, 1))}"/></svg>
            <div class="center"><div class="num">${fmtInt(tot.kcal)}</div><div class="lbl">${t('eaten')}</div></div>
          </div>
          <div class="kcal-stats">
            <div><div class="num">${fmtInt(g.kcal)}</div><div class="lbl">${t('Goal')}</div></div>
            <div><div class="num" style="color:${remaining < 0 ? 'var(--danger)' : 'inherit'}">${remaining < 0 ? '+' + fmtInt(-remaining) : fmtInt(remaining)}</div><div class="lbl">${remaining < 0 ? t('Over') : t('Remaining')}</div></div>
            <div><div class="num">${Math.round(pct * 100)}%</div><div class="lbl">${t('of goal')}</div></div>
          </div>
        </div>
        <div class="macros">${macro('p', 'Protein', 'protein')}${macro('c', 'Carbs', 'carbs')}${macro('f', 'Fat', 'fat')}</div>
      </div>
      <div class="section"><div class="stack">${mealHtml}</div></div>`;
  }

  /* --------- Add food modal --------- */
  function openAddFood(meal) {
    ui.modal = { type: 'addFood', meal, search: '', foodId: null, grams: null };
    renderModal();
  }
  function foodResultsHtml(q) {
    const s = norm(q.trim());
    const m = ui.modal;
    let list, head = '';
    if (!s) {
      const recent = recentFoodIds().map((id) => state.foods.find((f) => f.id === id)).filter(Boolean);
      list = recent.length ? recent : state.foods.slice(0, 12);
      head = recent.length ? t('Recent') : t('Suggestions');
    } else {
      list = state.foods.filter((f) => matches(foodName(f), f.name, s) || (f.barcode && f.barcode.includes(s))).sort((a, b) => foodName(a).toLowerCase().indexOf(s) - foodName(b).toLowerCase().indexOf(s)).slice(0, 40);
      head = list.length ? (list.length === 1 ? t('{n} result', { n: 1 }) : t('{n} results', { n: list.length })) : '';
    }
    const codeRow = /^\d{8,14}$/.test(s) ? `<div class="food-result" data-action="lookup-code" data-code="${s}" style="color:var(--accent)"><div class="grow"><div class="title">${I.scan} ${t('Look up barcode {code}', { code: s })}</div><div class="sub">${t('Searches Open Food Facts')}</div></div></div>` : '';
    let offRow = '';
    if (s.length >= 3 && !/^\d+$/.test(s)) {
      const off = m && m.off && m.off.q === s ? m.off : null;
      if (!off) offRow = `<div class="food-result" data-action="off-search" data-q="${esc(q.trim())}" style="color:var(--accent)"><div class="grow"><div class="title">${t('Search Open Food Facts for “{q}”', { q: esc(q.trim()) })}</div></div></div>`;
      else if (off.loading) offRow = `<div class="small muted" style="padding:10px 8px">${t('Searching Open Food Facts…')}</div>`;
      else if (off.error) offRow = `<div class="small muted" style="padding:10px 8px">${t('Could not reach Open Food Facts')}</div>`;
      else if (!off.items.length) offRow = `<div class="small muted" style="padding:10px 8px">${t('No products found on Open Food Facts')}</div>`;
      else offRow = `<div class="small muted" style="padding:10px 8px 0;font-weight:600">${t('Open Food Facts')}</div>` + off.items.map((it, i) => `<div class="food-result" data-action="pick-off" data-i="${i}"><div class="grow"><div class="title">${esc(it.name)}</div><div class="sub">${t('per 100 g')} · ${macroDots(it)}</div></div><div class="val">${Math.round(it.kcal)}</div></div>`).join('');
    }
    const savedRows = !s && state.meals.length ? `<div class="small muted" style="padding:6px 8px 0">${t('Saved meals')}</div>` + state.meals.map((sm) => { const tot = sumMacros(sm.items); return `<div class="food-result" data-action="add-saved-meal" data-id="${sm.id}"><div class="grow"><div class="title">${I.star} ${esc(sm.name)}</div><div class="sub">${t('{n} items', { n: sm.items.length })} · ${fmtInt(tot.kcal)} kcal</div></div><button class="icon-btn danger" data-action="del-saved-meal" data-id="${sm.id}" aria-label="${t('Delete')}">${I.x}</button></div>`; }).join('') : '';
    if (!list.length) return codeRow + offRow + `<div class="empty"><strong>${t('No foods match “{q}”', { q: esc(q) })}</strong>${codeRow || offRow ? t('Or create it below.') : t('Create it below and it will be saved to your library.')}</div>`;
    return codeRow + savedRows + `<div class="small muted" style="padding:6px 8px 0">${head}</div>` + list.map((f) => `
      <div class="food-result" data-action="pick-food" data-id="${f.id}">
        <div class="grow"><div class="title">${esc(foodName(f))}</div><div class="sub">${t('per 100 g')} · ${macroDots(f)}</div></div>
        <div class="val">${f.kcal}</div>
      </div>`).join('') + offRow;
  }
  async function offSearch(q) {
    const m = ui.modal; if (!m || m.type !== 'addFood') return;
    const key = norm(q.trim()); m.off = { q: key, loading: true, items: [] };
    const box = $('#food-results'); if (box) box.innerHTML = foodResultsHtml(m.search);
    try {
      const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q.trim())}&search_simple=1&action=process&json=1&page_size=12&cc=cl&lc=es&fields=code,product_name,product_name_es,brands,nutriments,serving_quantity`);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      const items = (j.products || []).map(productToFood).filter((x) => x && x.name && x.kcal !== '');
      if (ui.modal?.type === 'addFood' && ui.modal.off?.q === key) { ui.modal.off = { q: key, loading: false, items }; const b = $('#food-results'); if (b) b.innerHTML = foodResultsHtml(ui.modal.search); }
    } catch (e) {
      if (ui.modal?.type === 'addFood' && ui.modal.off?.q === key) { ui.modal.off = { q: key, loading: false, items: [], error: true }; const b = $('#food-results'); if (b) b.innerHTML = foodResultsHtml(ui.modal.search); }
    }
  }
  function modalAddFood() {
    const m = ui.modal;
    if (!m.foodId) {
      return `<div class="modal-head"><h2>${t('Add to {meal}', { meal: mealLabel(m.meal) })}</h2><button class="icon-btn" data-action="modal-close">${I.x}</button></div>
        <div class="input-row"><input class="input" id="food-search" placeholder="${t('Search foods…')}" value="${esc(m.search)}" autocomplete="off" data-field="food-search" /><button class="btn icon" data-action="scan" aria-label="${t('Scan barcode')}" title="${t('Scan barcode')}">${I.scan}</button></div>
        <div class="results" id="food-results">${foodResultsHtml(m.search)}</div>
        <div class="modal-foot"><button class="btn" data-action="new-food" data-meal="${m.meal}">${I.plus} ${t('Create new food')}</button></div>`;
    }
    const f = modalFood(m);
    const grams = m.grams ?? f.serving ?? 100;
    const mac = macrosFor(f, grams);
    const chips = [...new Set([f.serving, 50, 100, 150, 200].filter(Boolean))].slice(0, 5);
    return `<div class="modal-head">${m.editId ? '' : `<button class="icon-btn" data-action="pick-food" data-id="">${I.left}</button>`}<h2 style="flex:1">${esc(foodName(f))}</h2><button class="icon-btn" data-action="modal-close">${I.x}</button></div>
      ${m.editId ? `<p class="small muted" style="margin:-6px 0 12px">${t('Edit amount')}</p>` : ''}
      <div class="field"><label>${t('Amount')}</label>
        <div class="input-row"><div class="input-suffix" style="flex:1"><input class="input" type="number" inputmode="decimal" id="food-grams" value="${round(grams, 1)}" min="0" step="1" data-field="food-grams" autofocus /><span>g</span></div>
        <select class="input" style="width:auto" data-field="food-meal">${MEALS.map(([k, l]) => `<option value="${k}" ${k === m.meal ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></div>
      </div>
      <div class="chips" style="margin-top:10px">${chips.map((g) => `<button class="chip ${g === grams ? 'active' : ''}" data-action="food-chip" data-g="${g}">${g === f.serving ? t('1 serving') + ' · ' : ''}${g} g</button>`).join('')}</div>
      <div class="summary-box" style="margin-top:14px" id="food-summary">${summaryHtml(mac)}</div>
      <div class="modal-foot"><button class="btn primary" data-action="confirm-food">${m.editId ? t('Save') : t('Add {n} kcal', { n: fmtInt(mac.kcal) })}</button></div>`;
  }
  const modalSaveMeal = () => `<div class="modal-head"><h2>${t('Save as meal')}</h2><button class="icon-btn" data-action="modal-close">${I.x}</button></div>
      <div class="field"><label>${t('Name this meal')}</label><input class="input" id="meal-name" data-field="meal-name" value="${esc(ui.modal.name)}" placeholder="${t('e.g. Usual breakfast')}" autofocus /></div>
      <p class="small muted" style="margin-top:10px">${t('{n} items', { n: ui.modal.items.length })} · ${ui.modal.items.map((e) => esc(e.name)).join(', ')}</p>
      <div class="modal-foot"><button class="btn primary" data-action="save-meal-confirm">${t('Save')}</button></div>`;
  const summaryHtml = (mac) => `<div><div class="num">${fmtInt(mac.kcal)}</div><div class="lbl">kcal</div></div><div><div class="num">${round(mac.p)} g</div><div class="lbl">${t('Protein')}</div></div><div><div class="num">${round(mac.c)} g</div><div class="lbl">${t('Carbs')}</div></div><div><div class="num">${round(mac.f)} g</div><div class="lbl">${t('Fat')}</div></div>`;

  function addEntry(meal, food, grams) {
    const mac = macrosFor(food, grams);
    state.logs[ui.date] = state.logs[ui.date] || {};
    (state.logs[ui.date][meal] = state.logs[ui.date][meal] || []).push({ id: uid(), foodId: food.id, name: foodName(food), grams, ...mac });
    save();
  }

  /* --------- Food form (create / edit) --------- */
  function openFoodForm(foodId, returnTo, prefill) {
    const f = foodId ? state.foods.find((x) => x.id === foodId) : null;
    const blank = { name: '', kcal: '', p: '', c: '', f: '', serving: '', barcode: '' };
    const draft = f ? { name: foodName(f), kcal: f.kcal, p: f.p, c: f.c, f: f.f, serving: f.serving || '', barcode: f.barcode || '' } : { ...blank, ...(prefill || {}) };
    ui.modal = { type: 'foodForm', foodId, returnTo, basis: '100', note: prefill?.note || '', draft };
    renderModal();
  }
  function modalFoodForm() {
    const m = ui.modal, d = m.draft;
    const per100 = m.basis === '100';
    return `<div class="modal-head"><h2>${m.foodId ? t('Edit food') : t('New food')}</h2><button class="icon-btn" data-action="modal-close">${I.x}</button></div>
      ${m.note ? `<div class="note">${esc(m.note)}</div>` : ''}
      <div class="stack">
        ${d.barcode ? `<div class="row between small"><span class="muted">${t('Barcode')} <span class="mono" style="color:var(--text)">${esc(d.barcode)}</span></span><button class="btn ghost sm" data-action="scan">${I.scan} ${t('Rescan')}</button></div>` : ''}
        <div class="field"><label>${t('Name')}</label><input class="input" data-field="ff-name" value="${esc(d.name)}" placeholder="${t('e.g. Oat milk')}" /></div>
        <div class="field"><label>${t('Serving size (optional)')}</label><div class="input-suffix"><input class="input" type="number" inputmode="decimal" data-field="ff-serving" value="${esc(d.serving)}" placeholder="${t('e.g. 250')}" /><span>g</span></div></div>
        <div class="row between"><label class="small" style="color:var(--text-2);font-weight:500">${t('Nutrition values are per')}</label>
          <div class="seg"><button class="${per100 ? 'active' : ''}" data-action="ff-basis" data-b="100">${t('100 g')}</button><button class="${!per100 ? 'active' : ''}" data-action="ff-basis" data-b="serving" ${!d.serving ? 'disabled' : ''}>${t('1 serving')}</button></div></div>
        <div class="grid-4">
          <div class="field"><label>kcal</label><input class="input" type="number" inputmode="decimal" data-field="ff-kcal" value="${esc(d.kcal)}" /></div>
          <div class="field"><label>${t('Protein g')}</label><input class="input" type="number" inputmode="decimal" data-field="ff-p" value="${esc(d.p)}" /></div>
          <div class="field"><label>${t('Carbs g')}</label><input class="input" type="number" inputmode="decimal" data-field="ff-c" value="${esc(d.c)}" /></div>
          <div class="field"><label>${t('Fat g')}</label><input class="input" type="number" inputmode="decimal" data-field="ff-f" value="${esc(d.f)}" /></div>
        </div>
      </div>
      <div class="modal-foot">${m.foodId ? `<button class="btn danger" data-action="ff-delete">${t('Delete')}</button>` : ''}<button class="btn primary" data-action="ff-save">${t('Save')}</button></div>`;
  }
  function saveFoodForm() {
    const m = ui.modal, d = m.draft;
    const name = d.name.trim();
    if (!name) return toast(t('Give the food a name'));
    const serving = num(d.serving, 0) || null;
    let factor = 1;
    if (m.basis === 'serving') { if (!serving) return toast(t('Enter a serving size first')); factor = 100 / serving; }
    const vals = { kcal: round(num(d.kcal) * factor, 1), p: round(num(d.p) * factor, 1), c: round(num(d.c) * factor, 1), f: round(num(d.f) * factor, 1) };
    const barcode = String(d.barcode || '').trim() || null;
    if (m.foodId) {
      const f = state.foods.find((x) => x.id === m.foodId);
      const renamed = name !== foodName(f);
      Object.assign(f, { serving, barcode, ...vals });
      if (renamed || !f.builtin) { f.name = name; f.builtin = false; }
      else if (f.kcal !== vals.kcal || f.p !== vals.p || f.c !== vals.c || f.f !== vals.f) f.builtin = false;
    } else {
      const f = { id: uid(), name, serving, barcode, ...vals, builtin: false };
      state.foods.unshift(f);
      if (m.returnTo?.meal) { save(); ui.modal = { type: 'addFood', meal: m.returnTo.meal, search: '', foodId: f.id, grams: null }; renderModal(); return; }
    }
    save(); closeModal(); render(); toast(t('Food saved'));
  }

  /* --------- Barcode scanner + Open Food Facts --------- */
  const OFF_URL = 'https://world.openfoodfacts.org/api/v2/product/';
  const scan = { stream: null, timer: null, reader: null, handled: false };
  function openScanner(returnTo) { ui.modal = { type: 'scan', returnTo, status: '', busy: false, code: '' }; renderModal(); }
  function modalScan() {
    const m = ui.modal;
    return `<div class="modal-head"><h2>${t('Scan barcode')}</h2><button class="icon-btn" data-action="modal-close">${I.x}</button></div>
      <div class="scan-box ${m.busy ? 'busy' : ''}"><video id="scan-video" playsinline muted autoplay></video><div class="scan-frame"></div><div class="scan-line"></div></div>
      <p class="small muted" id="scan-status" style="margin-top:10px;min-height:20px">${esc(m.status || t('Point the camera at the barcode'))}</p>
      <div class="input-row" style="margin-top:10px"><input class="input" id="scan-manual" inputmode="numeric" placeholder="${t('Or type the number under the barcode')}" value="${esc(m.code)}" autocomplete="off" /><button class="btn" data-action="scan-manual">${t('Look up')}</button></div>
      <p class="small muted" style="margin-top:10px">${t('Products are looked up on Open Food Facts. If one is missing, type the label values and it is saved with the barcode for next time.')}</p>`;
  }
  function setScanStatus(text) { if (ui.modal?.type === 'scan') { ui.modal.status = text; const el = $('#scan-status'); if (el) el.textContent = text; } }
  async function startScanner() {
    scan.handled = false;
    const video = $('#scan-video'); if (!video) return;
    if (!navigator.mediaDevices?.getUserMedia) { setScanStatus(window.isSecureContext ? t('No camera available here. Type the number instead.') : t('The camera needs HTTPS or localhost. Type the number instead.')); return; }
    try {
      const devices = await Promise.race([navigator.mediaDevices.enumerateDevices().catch(() => []), new Promise((r) => setTimeout(() => r([]), 1500))]);
      if (devices.length && !devices.some((d) => d.kind === 'videoinput')) { setScanStatus(t('No camera found on this device. Type the number instead.')); return; }
      if (ui.modal?.type !== 'scan') return;
      if ('BarcodeDetector' in window) {
        const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
        scan.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
        if (ui.modal?.type !== 'scan') { stopScanner(); return; }
        video.srcObject = scan.stream; await video.play();
        scan.timer = setInterval(async () => {
          if (scan.handled || video.readyState < 2) return;
          try { const codes = await det.detect(video); const c = codes.find((x) => x.rawValue && x.rawValue.length >= 8); if (c) handleBarcode(c.rawValue); } catch {}
        }, 180);
      } else {
        setScanStatus(t('Loading scanner…'));
        if (!window.ZXing) await new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); setTimeout(() => rej(new Error('timeout')), 12000); });
        if (ui.modal?.type !== 'scan') return;
        const hints = new Map(); hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E, ZXing.BarcodeFormat.CODE_128]);
        scan.reader = new ZXing.BrowserMultiFormatReader(hints, 250);
        await scan.reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } }, audio: false }, video, (result) => { if (result && !scan.handled) handleBarcode(result.getText()); });
        setScanStatus(t('Point the camera at the barcode'));
      }
    } catch (e) {
      const denied = e && /NotAllowed|Permission/i.test(String(e.name) + String(e.message));
      setScanStatus(denied ? t('Camera permission denied. Type the number instead.') : t('Could not start the camera. Type the number instead.'));
    }
  }
  function stopScanner() {
    clearInterval(scan.timer); scan.timer = null;
    if (scan.reader) { try { scan.reader.reset(); } catch {} scan.reader = null; }
    if (scan.stream) { scan.stream.getTracks().forEach((tr) => tr.stop()); scan.stream = null; }
  }
  async function lookupBarcode(code) {
    const r = await fetch(`${OFF_URL}${encodeURIComponent(code)}.json?fields=product_name,product_name_es,brands,nutriments,serving_quantity,quantity`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (!j.product || j.status === 0) return null;
    return productToFood(j.product);
  }
  function productToFood(p) {
    if (!p) return null;
    const n = p.nutriments || {};
    let kcal = n['energy-kcal_100g'];
    if (kcal == null && n['energy-kj_100g'] != null) kcal = n['energy-kj_100g'] / 4.184;
    if (kcal == null && n['energy_100g'] != null) kcal = n['energy_100g'] / 4.184;
    const base = (p.product_name_es || p.product_name || '').trim(), brand = (p.brands || '').split(',')[0].trim();
    const name = [base, brand && !base.toLowerCase().includes(brand.toLowerCase()) ? brand : ''].filter(Boolean).join(' · ');
    const v = (x) => (x == null || x === '' ? '' : round(Number(x), 1));
    return { name: name || '', kcal: v(kcal), p: v(n.proteins_100g) || 0, c: v(n.carbohydrates_100g) || 0, f: v(n.fat_100g) || 0, serving: p.serving_quantity ? round(Number(p.serving_quantity), 0) : '', barcode: p.code ? String(p.code) : '' };
  }
  async function handleBarcode(raw) {
    const code = String(raw).replace(/\D/g, '');
    if (code.length < 8) { setScanStatus(t('That does not look like a product barcode.')); return; }
    if (scan.handled) return; scan.handled = true;
    stopScanner();
    if (navigator.vibrate) navigator.vibrate(60);
    const returnTo = ui.modal?.returnTo || null;
    const goToFood = (food) => {
      if (returnTo?.meal) { ui.modal = { type: 'addFood', meal: returnTo.meal, search: '', foodId: food.id, grams: null }; renderModal(); }
      else openFoodForm(food.id, null);
    };
    const existing = state.foods.find((f) => f.barcode === code);
    if (existing) { goToFood(existing); toast(t('Found {name} in your library', { name: foodName(existing) })); return; }
    setScanStatus(t('Looking up {code}…', { code })); if (ui.modal?.type === 'scan') { ui.modal.busy = true; ui.modal.code = code; }
    try {
      const p = await lookupBarcode(code);
      if (ui.modal?.type !== 'scan') return;
      if (!p) { openFoodForm(null, returnTo, { barcode: code, note: t('Not in Open Food Facts yet. Enter the values from the label; they will be saved with this barcode.') }); return; }
      const missing = p.kcal === '' ? t('Calories are missing in the database. Copy them from the label.') : '';
      openFoodForm(null, returnTo, { ...p, barcode: code, note: missing || t('Found on Open Food Facts. Check the values against the label, then save.') });
    } catch (e) {
      scan.handled = false; if (ui.modal?.type === 'scan') ui.modal.busy = false;
      setScanStatus(t('Could not reach Open Food Facts. Check your connection and try again.'));
    }
  }

  /* =========================== FOODS =========================== */
  const libraryFiltered = (q) => {
    const s = norm(q.trim());
    return state.foods.filter((f) => !s || matches(foodName(f), f.name, s) || (f.barcode && f.barcode.includes(s))).sort((a, b) => (a.builtin === b.builtin ? foodName(a).localeCompare(foodName(b), locale()) : a.builtin ? 1 : -1));
  };
  function viewFoods() {
    return `
      <div class="page-head"><div><h1>${t('Foods')}</h1><div class="sub">${t('{n} foods in your library', { n: state.foods.length })}</div></div><div class="row"><button class="btn sm" data-action="scan">${I.scan} ${t('Scan')}</button><button class="btn primary sm" data-action="new-food">${I.plus} ${t('New food')}</button></div></div>
      <input class="input" placeholder="${t('Search library…')}" value="${esc(ui.foodSearch)}" data-field="library-search" autocomplete="off" />
      <div class="card" style="margin-top:12px">
        <div class="list" id="library-list">${foodLibraryList(libraryFiltered(ui.foodSearch))}</div>
      </div>`;
  }
  const foodLibraryList = (list) => list.length ? list.map((f) => `
    <div class="list-item clickable" data-action="edit-food" data-id="${f.id}">
      <div class="grow"><div class="title">${esc(foodName(f))} ${f.builtin ? '' : `<span class="chip tag" style="margin-left:6px">${t('custom')}</span>`}</div>
        <div class="sub"><span class="macro-dots"><span class="p"><i></i>${f.p} g</span><span class="c"><i></i>${f.c} g</span><span class="f"><i></i>${f.f} g</span></span>${f.serving ? ` · ${t('serving {n} g', { n: f.serving })}` : ''}</div></div>
      <div class="val">${f.kcal} <span class="muted small" style="font-weight:400">${t('kcal/100g')}</span></div>
    </div>`).join('') : `<div class="empty"><strong>${t('Nothing found')}</strong>${t('Try another name or create a new food.')}</div>`;

  /* =========================== GYM =========================== */
  const exById = (id) => state.exercises.find((e) => e.id === id);
  const exDisplay = (id, fallback) => { const e = exById(id); return e ? exName(e) : (fallback || '?'); };
  const lastSetsFor = (exerciseId) => {
    for (const w of [...state.workouts].sort((a, b) => b.endedAt - a.endedAt)) {
      const ex = w.exercises.find((e) => e.exId === exerciseId);
      if (ex) { const done = ex.sets.filter((s) => s.done); if (done.length) return done; }
    }
    return null;
  };
  const workoutVolume = (w) => w.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + (s.done ? (s.weight || 0) * (s.reps || 0) : 0), 0), 0);
  const workoutSets = (w) => w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const lastDoneRoutine = (rid) => { const w = state.workouts.filter((x) => x.routineId === rid).sort((a, b) => b.endedAt - a.endedAt)[0]; return w ? w.date : null; };
  const workoutName = (w) => (w.routineId && /^r_(push|pull|legs)$/.test(w.routineId) && ['Push', 'Pull', 'Legs'].includes(w.name) ? t(w.name) : w.name === 'Workout' ? t('Workout') : w.name);

  function viewGym() {
    if (state.activeWorkout) return viewWorkout();
    const routines = state.routines.map((r) => {
      const last = lastDoneRoutine(r.id);
      return `<div class="card routine-card">
        <div class="head"><div><div class="name">${esc(routineName(r))}</div><div class="small muted">${t('{n} exercises', { n: r.exercises.length })}${last ? ` · ${t('last {day}', { day: relDay(last).toLowerCase() })}` : ''}</div></div>
          <button class="icon-btn" data-action="edit-routine" data-id="${r.id}" aria-label="${t('Edit routine')}">${I.edit}</button></div>
        <div class="ex-list">${r.exercises.map((e) => `${esc(exDisplay(e.exId))} <span class="muted">${e.sets}×${esc(e.reps)}</span>`).join(' · ')}</div>
        <button class="btn primary sm" data-action="start-routine" data-id="${r.id}">${I.play} ${t('Start workout')}</button>
      </div>`;
    }).join('');
    const hist = [...state.workouts].sort((a, b) => b.endedAt - a.endedAt).slice(0, 20);
    return `
      <div class="page-head"><div><h1>${t('Gym')}</h1><div class="sub">${t('{n} workouts in the last 7 days', { n: state.workouts.filter((w) => w.date >= addDays(dateKey(), -6)).length })}</div></div>
        <button class="btn sm" data-action="start-empty">${I.plus} ${t('Empty workout')}</button></div>
      <div class="section-head"><h3>${t('Routines')}</h3><button class="btn ghost sm" data-action="new-routine">${I.plus} ${t('New routine')}</button></div>
      <div class="stack">${routines || `<div class="card empty"><strong>${t('No routines yet')}</strong>${t('Create one to start logging faster.')}</div>`}</div>
      <div class="section"><div class="section-head"><h3>${t('History')}</h3></div>
        <div class="card">${hist.length ? hist.map(historyItem).join('') : `<div class="empty"><strong>${t('No workouts yet')}</strong>${t('Finish a workout and it will show up here.')}</div>`}</div></div>`;
  }
  function historyItem(w) {
    return `<details class="hist">
      <summary><div class="grow" style="flex:1;min-width:0"><div class="title" style="font-weight:600">${esc(workoutName(w))}</div><div class="small muted">${fmtDate(w.date)} · ${fmtDur(w.endedAt - w.startedAt)} · ${workoutSets(w)} ${t('sets')} · ${fmtInt(toDisplayW(workoutVolume(w)))} ${unit()}</div></div><span class="icon-btn">${I.chev}</span></summary>
      <div class="body">${w.exercises.map((e) => `<div class="ex-line"><span>${esc(exDisplay(e.exId, e.name))}</span><span>${e.sets.filter((s) => s.done).map((s) => `${s.weight ? toDisplayW(s.weight) : '–'}×${s.reps || 0}`).join(', ') || t('no sets')}</span></div>`).join('')}
        <div class="row" style="margin-top:8px"><button class="btn ghost sm" data-action="repeat-workout" data-id="${w.id}">${I.play} ${t('Repeat')}</button><span class="spacer"></span><button class="btn ghost sm" data-action="delete-workout" data-id="${w.id}" style="color:var(--danger)">${t('Delete')}</button></div>
      </div></details>`;
  }

  function startWorkout(routine) {
    state.activeWorkout = {
      id: uid(), routineId: routine?.id || null, name: routine?.name || 'Workout', date: dateKey(), startedAt: Date.now(),
      exercises: (routine?.exercises || []).map((e) => {
        const ex = exById(e.exId); const prev = lastSetsFor(e.exId);
        return { exId: e.exId, name: ex?.name || '?', muscle: ex?.muscle || '', target: e.reps, sets: Array.from({ length: e.sets || 3 }, (_, i) => ({ weight: prev?.[i]?.weight ?? prev?.[prev.length - 1]?.weight ?? null, reps: null, done: false })) };
      }),
    };
    save(); ui.tab = 'gym'; render();
  }
  function viewWorkout() {
    const w = state.activeWorkout;
    return `
      <div class="workout-head"><div><h1>${esc(workoutName(w))}</h1><div class="timer">${t('Started {time}', { time: new Date(w.startedAt).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }) })} · <span id="elapsed">${fmtDur(Date.now() - w.startedAt)}</span></div></div>
        <button class="btn primary sm" data-action="finish-workout">${t('Finish')}</button></div>
      <div class="stack">${w.exercises.map((e, ei) => exerciseCard(e, ei)).join('')}
        <button class="btn block" data-action="wk-add-exercise">${I.plus} ${t('Add exercise')}</button>
        <button class="btn ghost block" data-action="discard-workout" style="color:var(--danger)">${t('Discard workout')}</button>
      </div>`;
  }
  function exerciseCard(e, ei) {
    const prev = lastSetsFor(e.exId);
    return `<div class="card ex-card" data-ei="${ei}">
      <div class="ex-head"><div><div class="ex-name">${esc(exDisplay(e.exId, e.name))}</div><div class="ex-muscle">${esc(muscleName(e.muscle))}${e.target ? ` · ${t('target {reps} reps', { reps: esc(e.target) })}` : ''}</div></div>
        <button class="icon-btn danger" data-action="wk-remove-exercise" data-ei="${ei}" aria-label="${t('Remove exercise')}">${I.x}</button></div>
      <div class="sets">
        <div class="h">${t('Set')}</div><div class="h">${t('Previous')}</div><div class="h">${unit()}</div><div class="h">${t('Reps')}</div><div class="h"></div>
        ${e.sets.map((s, si) => `<div class="set-row ${s.done ? 'done' : ''}">
          <div class="n">${si + 1}</div>
          <div class="prev">${prev?.[si] ? `${prev[si].weight ? toDisplayW(prev[si].weight) + ' ' + unit() : t('BW')} × ${prev[si].reps}` : '—'}</div>
          <input class="input" type="number" inputmode="decimal" placeholder="${prev?.[si]?.weight ? toDisplayW(prev[si].weight) : '–'}" value="${s.weight == null ? '' : toDisplayW(s.weight)}" data-field="set-weight" data-ei="${ei}" data-si="${si}" />
          <input class="input" type="number" inputmode="numeric" placeholder="${prev?.[si]?.reps ?? '–'}" value="${s.reps == null ? '' : s.reps}" data-field="set-reps" data-ei="${ei}" data-si="${si}" />
          <button class="check ${s.done ? 'done' : ''}" data-action="toggle-set" data-ei="${ei}" data-si="${si}" aria-label="${t('Mark set done')}">${I.check}</button>
        </div>`).join('')}
      </div>
      <div class="ex-foot"><button class="btn ghost sm" data-action="wk-add-set" data-ei="${ei}">${I.plus} ${t('Add set')}</button>${e.sets.length > 1 ? `<button class="btn ghost sm" data-action="wk-remove-set" data-ei="${ei}">${t('Remove set')}</button>` : ''}</div>
    </div>`;
  }
  let elapsedTimer;
  function startElapsed() { stopElapsed(); elapsedTimer = setInterval(() => { const el = $('#elapsed'); if (el && state.activeWorkout) el.textContent = fmtDur(Date.now() - state.activeWorkout.startedAt); }, 1000); }
  function stopElapsed() { clearInterval(elapsedTimer); }

  function finishWorkout() {
    const w = state.activeWorkout;
    const doneSets = workoutSets(w);
    if (!doneSets) return toast(t('Mark at least one set as done'));
    const finished = { ...w, endedAt: Date.now(), exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })).filter((e) => e.sets.length) };
    state.workouts.push(finished); state.activeWorkout = null; stopRest(); save();
    render(); toast(t('Workout saved · {n} sets · {v} {u} lifted', { n: doneSets, v: fmtInt(toDisplayW(workoutVolume(finished))), u: unit() }));
  }

  // Rest timer
  let restEnd = 0, restTimer, audioCtx;
  function beep() {
    if (TEST || navigator.webdriver) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      [0, 0.18].forEach((off) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'sine'; o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination); g.gain.setValueAtTime(0.0001, now + off); g.gain.exponentialRampToValueAtTime(0.25, now + off + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.15); o.start(now + off); o.stop(now + off + 0.16); });
    } catch {}
  }
  function startRest(sec = state.settings.restSeconds) {
    if (!sec) return;
    if (!TEST && !navigator.webdriver) { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch {} }
    restEnd = Date.now() + sec * 1000; clearInterval(restTimer); restTimer = setInterval(tickRest, 250); tickRest();
  }
  function tickRest() {
    const pill = $('#rest-pill'); const left = Math.ceil((restEnd - Date.now()) / 1000);
    if (left <= 0) { stopRest(); if (navigator.vibrate) navigator.vibrate([150, 80, 150]); beep(); toast(t('Rest over — next set')); return; }
    pill.hidden = false;
    pill.innerHTML = `<span>${t('Rest {t}', { t: fmtDur(left * 1000) })}</span><button data-action="rest-add">+30s</button><button data-action="rest-skip">${t('Skip')}</button>`;
  }
  function stopRest() { clearInterval(restTimer); restEnd = 0; $('#rest-pill').hidden = true; }

  /* --------- Routine editor --------- */
  function openRoutineEditor(routineId) {
    const r = routineId ? state.routines.find((x) => x.id === routineId) : null;
    const draft = r ? JSON.parse(JSON.stringify(r)) : { id: uid(), name: '', exercises: [] };
    if (r) draft.name = routineName(r);
    ui.modal = { type: 'routine', routineId, draft };
    renderModal();
  }
  function modalRoutine() {
    const d = ui.modal.draft;
    return `<div class="modal-head"><h2>${ui.modal.routineId ? t('Edit routine') : t('New routine')}</h2><button class="icon-btn" data-action="modal-close">${I.x}</button></div>
      <div class="field"><label>${t('Name')}</label><input class="input" data-field="rt-name" value="${esc(d.name)}" placeholder="${t('e.g. Upper A')}" /></div>
      <div class="section-head" style="margin-top:16px"><h3>${t('Exercises')}</h3><button class="btn ghost sm" data-action="rt-add-exercise">${I.plus} ${t('Add')}</button></div>
      <div class="list">${d.exercises.length ? d.exercises.map((e, i) => `
        <div class="list-item">
          <div class="grow"><div class="title">${esc(exDisplay(e.exId))}</div><div class="sub">${esc(muscleName(exById(e.exId)?.muscle || ''))}</div></div>
          <div class="input-suffix" style="width:72px"><input class="input" type="number" inputmode="numeric" value="${e.sets}" min="1" data-field="rt-sets" data-i="${i}" style="padding-right:36px;text-align:center" /><span>${t('sets')}</span></div>
          <div class="input-suffix" style="width:86px"><input class="input" value="${esc(e.reps)}" data-field="rt-reps" data-i="${i}" placeholder="8-12" style="padding-right:36px;text-align:center" /><span>${t('reps')}</span></div>
          <div class="stack" style="gap:0"><button class="icon-btn" data-action="rt-move" data-i="${i}" data-dir="-1" aria-label="${t('Move up')}" ${i === 0 ? 'disabled style="opacity:.3"' : ''}>${I.up}</button><button class="icon-btn" data-action="rt-move" data-i="${i}" data-dir="1" aria-label="${t('Move down')}" ${i === d.exercises.length - 1 ? 'disabled style="opacity:.3"' : ''}>${I.down}</button></div>
          <button class="icon-btn danger" data-action="rt-remove" data-i="${i}" aria-label="${t('Remove')}">${I.x}</button>
        </div>`).join('') : `<div class="empty">${t('No exercises yet. Tap “Add” to pick from the library.')}</div>`}</div>
      <div class="modal-foot">${ui.modal.routineId ? `<button class="btn danger" data-action="rt-delete">${t('Delete')}</button>` : ''}<button class="btn primary" data-action="rt-save">${t('Save routine')}</button></div>`;
  }

  /* --------- Exercise picker --------- */
  function openExercisePicker(onPick) {
    ui.modal = { type: 'exPicker', search: '', onPick, prev: ui.modal };
    renderModal();
  }
  function exerciseResultsHtml(q) {
    const s = norm(q.trim());
    const list = state.exercises.filter((e) => !s || matches(exName(e), e.name, s) || norm(muscleName(e.muscle)).includes(s) || norm(e.muscle).includes(s));
    const groups = {};
    for (const e of list) (groups[e.muscle] = groups[e.muscle] || []).push(e);
    const html = Object.keys(groups).sort((a, b) => muscleName(a).localeCompare(muscleName(b), locale())).map((g) => `<div class="small muted" style="padding:10px 8px 2px;font-weight:600">${esc(muscleName(g))}</div>` + groups[g].map((e) => `<div class="food-result" data-action="pick-exercise" data-id="${e.id}"><div class="grow"><div class="title">${esc(exName(e))}</div></div></div>`).join('')).join('');
    const create = s && !list.some((e) => norm(exName(e)) === s) ? `<div class="food-result" data-action="create-exercise" style="color:var(--accent)"><div class="grow"><div class="title">${I.plus} ${t('Create “{q}”', { q: esc(q.trim()) })}</div></div></div>` : '';
    return (html || '') + create || `<div class="empty">${t('No exercises match.')}</div>`;
  }
  function modalExPicker() {
    return `<div class="modal-head"><button class="icon-btn" data-action="picker-back">${I.left}</button><h2 style="flex:1">${t('Choose exercise')}</h2><button class="icon-btn" data-action="modal-close">${I.x}</button></div>
      <input class="input" id="ex-search" placeholder="${t('Search by name or muscle…')}" value="${esc(ui.modal.search)}" data-field="ex-search" autocomplete="off" />
      <div class="results" id="ex-results">${exerciseResultsHtml(ui.modal.search)}</div>`;
  }

  /* =========================== PROGRESS =========================== */
  function viewProgress() {
    const today = dateKey();
    const weights = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
    const latest = weights[weights.length - 1];
    const ago30 = addDays(today, -30);
    const w30 = weights.filter((w) => w.date <= ago30).pop() || weights[0];
    const delta = latest && w30 && latest !== w30 ? latest.kg - w30.kg : null;
    const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -i)).map((k) => sumMacros(dayEntries(k)).kcal).filter((k) => k > 0);
    const avg7 = last7.length ? last7.reduce((a, b) => a + b, 0) / last7.length : 0;
    const wk = state.workouts.filter((w) => w.date >= addDays(today, -6)).length;
    const todayW = weights.find((w) => w.date === today);

    const kcalData = Array.from({ length: 14 }, (_, i) => { const k = addDays(today, -(13 - i)); return { key: k, label: fmtDate(k, { weekday: 'narrow' }), value: sumMacros(dayEntries(k)).kcal }; });
    const weightData = weights.filter((w) => w.date >= addDays(today, -90)).map((w) => ({ key: w.date, value: toDisplayW(w.kg) }));
    const wAvg7 = weightData.map((pt) => { const from = addDays(pt.key, -6); const win = weights.filter((w) => w.date >= from && w.date <= pt.key); return round(toDisplayW(win.reduce((a, w) => a + w.kg, 0) / win.length), 1); });
    // per-exercise progression: top set weight per session
    const exSessions = {};
    for (const w of [...state.workouts].sort((a, b) => a.date.localeCompare(b.date))) for (const e of w.exercises) { const top = Math.max(0, ...e.sets.filter((x) => x.done && x.weight).map((x) => x.weight)); if (top > 0) (exSessions[e.exId] = exSessions[e.exId] || { name: exDisplay(e.exId, e.name), pts: [] }).pts.push({ key: w.date, value: toDisplayW(top), ts: w.endedAt }); }
    const exOptions = Object.entries(exSessions).sort((a, b) => b[1].pts.length - a[1].pts.length || a[1].name.localeCompare(b[1].name, locale()));
    if (!ui.progressEx || !exSessions[ui.progressEx]) ui.progressEx = exOptions[0] ? exOptions[0][0] : null;
    const exPts = ui.progressEx ? Object.values(exSessions[ui.progressEx].pts.reduce((acc, pt) => { if (!acc[pt.key] || pt.value > acc[pt.key].value) acc[pt.key] = pt; return acc; }, {})).sort((a, b) => a.key.localeCompare(b.key)) : [];

    const bests = {};
    for (const w of state.workouts) for (const e of w.exercises) for (const s of e.sets) if (s.weight && (!bests[e.exId] || s.weight > bests[e.exId].weight || (s.weight === bests[e.exId].weight && s.reps > bests[e.exId].reps))) bests[e.exId] = { name: exDisplay(e.exId, e.name), weight: s.weight, reps: s.reps, date: w.date };
    const bestList = Object.values(bests).sort((a, b) => b.weight - a.weight).slice(0, 6);
    const goalDiff = avg7 - state.settings.goals.kcal;

    return `
      <div class="page-head"><div><h1>${t('Progress')}</h1><div class="sub">${t('Trends over the last weeks')}</div></div></div>
      <div class="tiles">
        <div class="card tile"><div class="lbl">${t('Body weight')}</div><div class="num">${latest ? toDisplayW(latest.kg) : '–'}<small>${unit()}</small></div><div class="delta ${delta != null && delta < 0 ? 'good' : ''}">${delta != null ? t('{d} {u} in 30 days', { d: (delta > 0 ? '+' : '') + round(toDisplayW(delta), 1), u: unit() }) : t('Log weight to see trend')}</div></div>
        <div class="card tile"><div class="lbl">${t('Avg. calories (7d)')}</div><div class="num">${avg7 ? fmtInt(avg7) : '–'}</div><div class="delta">${avg7 ? t('{d} vs goal', { d: (goalDiff > 0 ? '+' : '') + fmtInt(goalDiff) }) : t('No days logged')}</div></div>
        <div class="card tile"><div class="lbl">${t('Workouts (7d)')}</div><div class="num">${wk}</div><div class="delta">${t('{n} total', { n: state.workouts.length })}</div></div>
      </div>
      <div class="section"><div class="section-head"><h3>${t('Body weight')}</h3><span class="small muted">${t('last 90 days')}</span></div>
        <div class="card">
          <div class="input-row" style="margin-bottom:14px"><div class="input-suffix" style="flex:1"><input class="input" type="number" inputmode="decimal" id="weight-input" placeholder="${todayW ? toDisplayW(todayW.kg) : t('Today’s weight')}" value="" /><span>${unit()}</span></div><button class="btn primary" data-action="log-weight">${todayW ? t('Update') : t('Log')}</button></div>
          ${weightData.length >= 2 ? lineChart(weightData, { unit: unit(), avg: wAvg7 }) + `<div class="chart-legend"><span><i style="background:var(--accent)"></i>${t('Daily')}</span><span><i style="background:var(--text-2);height:0;border-top:2px dashed var(--text-2)"></i>${t('7-day average')}</span></div>` : `<div class="empty"><strong>${weightData.length ? t('One entry so far') : t('No weight logged yet')}</strong>${t('Log a couple of days to see the trend line.')}</div>`}
        </div></div>
      <div class="section"><div class="section-head"><h3>${t('Lifts')}</h3><span class="small muted">${t('Top set weight per session')}</span></div>
        <div class="card">
          ${exOptions.length ? `<select class="input" data-field="progress-ex" style="margin-bottom:14px">${exOptions.map(([id, o]) => `<option value="${id}" ${id === ui.progressEx ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select>` : ''}
          ${exPts.length >= 2 ? lineChart(exPts, { unit: unit() }) : `<div class="empty"><strong>${exOptions.length ? t('One entry so far') : t('No lifts with weight yet')}</strong>${t('Log the same exercise in two sessions to see its trend.')}</div>`}
        </div></div>
      <div class="section"><div class="section-head"><h3>${t('Calories')}</h3><span class="small muted">${t('last 14 days')}</span></div>
        <div class="card">${barChart(kcalData, state.settings.goals.kcal)}<div class="chart-legend"><span><i style="background:var(--accent)"></i>${t('Eaten')}</span><span><i style="background:var(--text-2);height:0;border-top:2px dashed var(--text-2)"></i>${t('Goal {n}', { n: fmtInt(state.settings.goals.kcal) })}</span></div></div></div>
      ${bestList.length ? `<div class="section"><div class="section-head"><h3>${t('Personal bests')}</h3></div><div class="card"><div class="list">${bestList.map((b) => `<div class="list-item"><div class="grow"><div class="title">${esc(b.name)}</div><div class="sub">${fmtDate(b.date)}</div></div><div class="val">${toDisplayW(b.weight)} ${unit()} × ${b.reps}</div></div>`).join('')}</div></div></div>` : ''}`;
  }

  /* --------- Charts (SVG) --------- */
  function lineChart(data, { unit: u, avg = null }) {
    const W = 600, H = 220, P = { t: 14, r: 12, b: 28, l: 38 };
    const xs = data.map((d) => parseKey(d.key).getTime());
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const vals = data.map((d) => d.value).concat(avg || []);
    let lo = Math.min(...vals), hi = Math.max(...vals); const padV = Math.max((hi - lo) * 0.25, 0.5); lo -= padV; hi += padV;
    const X = (tm) => P.l + (x1 === x0 ? 0.5 : (tm - x0) / (x1 - x0)) * (W - P.l - P.r);
    const Y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
    const pts = data.map((d, i) => [X(xs[i]), Y(d.value)]);
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${path} L${pts[pts.length - 1][0].toFixed(1)},${(H - P.b).toFixed(1)} L${pts[0][0].toFixed(1)},${(H - P.b).toFixed(1)} Z`;
    const ticks = 4; const grid = Array.from({ length: ticks + 1 }, (_, i) => lo + (hi - lo) * i / ticks);
    const labelIdx = [0, Math.floor((data.length - 1) / 2), data.length - 1].filter((v, i, a) => a.indexOf(v) === i);
    return `<div class="chart-wrap" data-chart="line" data-unit="${u}">
      <svg viewBox="0 0 ${W} ${H}" aria-label="${t('Body weight over time')}" role="img">
        <g class="grid">${grid.map((g) => `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(g).toFixed(1)}" y2="${Y(g).toFixed(1)}"/>`).join('')}</g>
        <g class="axis">${grid.map((g) => `<text x="${P.l - 8}" y="${(Y(g) + 4).toFixed(1)}" text-anchor="end">${round(g, 1)}</text>`).join('')}
          ${labelIdx.map((i) => `<text x="${pts[i][0].toFixed(1)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}">${fmtDate(data[i].key, { month: 'short', day: 'numeric' })}</text>`).join('')}</g>
        <g class="series"><path class="area" d="${area}"/><path d="${path}"/>${data.length <= 40 ? pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4"/>`).join('') : ''}</g>
        ${avg ? `<g class="avg"><path d="${avg.map((v, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"/></g>` : ''}
        <line class="hover-line" y1="${P.t}" y2="${H - P.b}" x1="0" x2="0"/>
        <rect class="hit" x="${P.l}" y="0" width="${W - P.l - P.r}" height="${H}"/>
      </svg>
      <div class="chart-tip"></div>
      <script type="application/json" class="chart-data">${JSON.stringify(pts.map((p, i) => ({ x: p[0], y: p[1], label: fmtDate(data[i].key), value: data[i].value, avg: avg ? avg[i] : null })))}</script>
    </div>`;
  }
  function barChart(data, goal) {
    const W = 600, H = 200, P = { t: 18, r: 12, b: 26, l: 40 };
    const max = Math.max(goal * 1.15, ...data.map((d) => d.value), 1);
    const Y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
    const bw = (W - P.l - P.r) / data.length;
    const ticks = 4; const grid = Array.from({ length: ticks + 1 }, (_, i) => max * i / ticks);
    const bars = data.map((d, i) => {
      const x = P.l + i * bw + bw * 0.18, w = bw * 0.64;
      if (!d.value) return `<rect class="empty" x="${x.toFixed(1)}" y="${(H - P.b - 3).toFixed(1)}" width="${w.toFixed(1)}" height="3" rx="1.5"/>`;
      const y = Y(d.value), h = H - P.b - y;
      return `<rect class="${d.value > goal ? 'over' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="4"/>`;
    }).join('');
    const tipData = data.map((d, i) => ({ x: P.l + i * bw + bw / 2, y: d.value ? Y(d.value) : H - P.b, label: fmtDate(d.key), value: d.value, i }));
    return `<div class="chart-wrap" data-chart="bar">
      <svg viewBox="0 0 ${W} ${H}" aria-label="${t('Calories per day')}" role="img">
        <g class="grid">${grid.map((g) => `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(g).toFixed(1)}" y2="${Y(g).toFixed(1)}"/>`).join('')}</g>
        <g class="axis">${grid.map((g) => `<text x="${P.l - 8}" y="${(Y(g) + 4).toFixed(1)}" text-anchor="end">${g >= 1000 ? round(g / 1000, 1) + 'k' : Math.round(g)}</text>`).join('')}
          ${data.map((d, i) => `<text x="${(P.l + i * bw + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>`).join('')}</g>
        <g class="bars">${bars}</g>
        <g class="goal"><line x1="${P.l}" x2="${W - P.r}" y1="${Y(goal).toFixed(1)}" y2="${Y(goal).toFixed(1)}"/></g>
        <line class="hover-line" y1="${P.t}" y2="${H - P.b}" x1="0" x2="0"/>
        <rect class="hit" x="${P.l}" y="0" width="${W - P.l - P.r}" height="${H}"/>
      </svg>
      <div class="chart-tip"></div>
      <script type="application/json" class="chart-data">${JSON.stringify(tipData)}</script>
    </div>`;
  }
  function wireCharts() {
    $$('.chart-wrap').forEach((wrap) => {
      const svg = $('svg', wrap), tip = $('.chart-tip', wrap), line = $('.hover-line', wrap);
      const pts = JSON.parse($('.chart-data', wrap).textContent);
      const vb = svg.viewBox.baseVal; const isBar = wrap.dataset.chart === 'bar'; const u = wrap.dataset.unit || '';
      const move = (ev) => {
        const r = svg.getBoundingClientRect(); const px = (ev.clientX - r.left) / r.width * vb.width;
        let best = pts[0]; for (const p of pts) if (Math.abs(p.x - px) < Math.abs(best.x - px)) best = p;
        const sx = best.x / vb.width * r.width, sy = best.y / vb.height * r.height;
        tip.style.left = `${sx}px`; tip.style.top = `${sy}px`; tip.style.opacity = 1;
        tip.innerHTML = isBar ? `${best.label}<br><b>${best.value ? fmtInt(best.value) + ' kcal' : t('not logged')}</b>` : `${best.label}<br><b>${best.value} ${u}</b>${best.avg != null ? `<br><span style="opacity:.75">${t('7-day average')}: ${best.avg}</span>` : ''}`;
        line.setAttribute('x1', best.x); line.setAttribute('x2', best.x); line.style.opacity = .6;
      };
      const leave = () => { tip.style.opacity = 0; line.style.opacity = 0; };
      svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move); svg.addEventListener('pointerleave', leave);
    });
  }

  /* =========================== Cloud sync (Firebase) =========================== */
  // Each section (settings, foods, ..., one per logged day, one per workout) has its own
  // last-modified time. Newer wins per section, so devices only overwrite what changed.
  const SYNC_KEY = 'fuel-lift-sync';
  const CORE = ['settings', 'exercises', 'routines', 'weights', 'activeWorkout', 'meals'];
  const cloud = { adapter: null, user: null, status: 'off', error: '', busy: false, unsub: [], dirty: new Set(), pushTimer: null, retryTimer: null, pendingRender: false };
  const sync = (() => { try { const v = JSON.parse(localStorage.getItem(SYNC_KEY)); return v && typeof v === 'object' ? v : {}; } catch { return {}; } })();
  if (!sync.mtimes) sync.mtimes = {};
  const snap = {}, wkMonths = {};
  const saveSync = () => localStorage.setItem(SYNC_KEY, JSON.stringify({ mtimes: sync.mtimes, uid: sync.uid || null, migrated: !!sync.migrated, everSignedIn: !!sync.everSignedIn }));
  const clean = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
  function sectionValues() {
    const out = {};
    for (const k of CORE) out['core:' + k] = state[k] ?? null;
    for (const f of state.foods) out['food:' + f.id] = f;
    for (const d of Object.keys(state.logs)) out['log:' + d] = state.logs[d];
    for (const w of state.workouts) out['wk:' + w.id] = w;
    return out;
  }
  function syncInitSnapshot() {
    const vals = sectionValues(); const d = defaultState(); const now = Date.now();
    const defaults = { 'core:settings': d.settings, 'core:exercises': d.exercises, 'core:routines': d.routines, 'core:weights': d.weights, 'core:activeWorkout': null, 'core:meals': [] };
    for (const f of d.foods) defaults['food:' + f.id] = f;
    for (const k of Object.keys(vals)) {
      snap[k] = JSON.stringify(vals[k]);
      if (k.startsWith('wk:')) wkMonths[k.slice(3)] = String(vals[k].date || '').slice(0, 7);
      if (!sync.migrated && sync.mtimes[k] == null) {
        const dv = k in defaults ? JSON.stringify(k === 'core:settings' ? { ...defaults[k], lang: vals[k] && vals[k].lang } : defaults[k]) : undefined;
        if (snap[k] !== dv) sync.mtimes[k] = now;
      }
    }
    sync.migrated = true; saveSync();
  }
  function syncDetectChanges() {
    const vals = sectionValues(); const now = Date.now(); let changed = false;
    for (const k of Object.keys(vals)) {
      const ser = JSON.stringify(vals[k]);
      if (snap[k] !== ser) { snap[k] = ser; sync.mtimes[k] = now; cloud.dirty.add(k); changed = true; if (k.startsWith('wk:')) wkMonths[k.slice(3)] = String(vals[k].date || '').slice(0, 7); }
    }
    for (const k of Object.keys(snap)) if (!(k in vals)) { delete snap[k]; sync.mtimes[k] = now; cloud.dirty.add(k); changed = true; }
    if (changed) { saveSync(); schedulePush(); }
  }
  const setStatus = (st, err = '') => { cloud.status = st; cloud.error = err; if (ui.tab === 'settings' && !document.activeElement?.matches('input, select')) render(); };
  function schedulePush(delay = 700) { if (!cloud.user || !cloud.adapter) return; clearTimeout(cloud.pushTimer); cloud.pushTimer = setTimeout(pushDirty, delay); }
  async function pushDirty() {
    if (!cloud.user || !cloud.adapter || !cloud.dirty.size) { if (cloud.user && cloud.status === 'syncing') setStatus(navigator.onLine ? 'synced' : 'offline'); return; }
    const keys = [...cloud.dirty]; cloud.dirty.clear();
    const vals = sectionValues(); const uid = cloud.user.uid; const groups = {};
    const add = (path, field, sub, value, ts) => {
      const pk = path.join('/'); const g = groups[pk] = groups[pk] || { path, data: { mtimes: {} }, fields: [] };
      if (sub) { g.data[field] = g.data[field] || {}; g.data[field][sub] = value; g.fields.push([field, sub]); g.data.mtimes[sub] = ts; g.fields.push(['mtimes', sub]); }
      else { g.data[field] = value; g.fields.push([field]); g.data.mtimes[field] = ts; g.fields.push(['mtimes', field]); }
    };
    for (const k of keys) {
      const ts = sync.mtimes[k] || Date.now();
      if (k.startsWith('core:')) add(['users', uid], k.slice(5), null, clean(vals[k]), ts);
      else if (k.startsWith('food:')) add(['users', uid, 'foods', 'all'], 'items', k.slice(5), clean(vals[k] || null), ts);
      else if (k.startsWith('log:')) { const d = k.slice(4); add(['users', uid, 'logs', d.slice(0, 7)], 'days', d, clean(vals[k] || {}), ts); }
      else if (k.startsWith('wk:')) { const id = k.slice(3); const w = vals[k] || null; const month = w ? String(w.date).slice(0, 7) : wkMonths[id]; if (!month) continue; add(['users', uid, 'workouts', month], 'items', id, clean(w), ts); }
    }
    setStatus('syncing');
    try {
      for (const g of Object.values(groups)) await cloud.adapter.setFields(g.path, g.data, g.fields);
      if (cloud.dirty.size) schedulePush(); else setStatus(navigator.onLine ? 'synced' : 'offline');
    } catch (e) {
      for (const k of keys) cloud.dirty.add(k);
      setStatus('error', describeErr(e));
      clearTimeout(cloud.retryTimer); cloud.retryTimer = setTimeout(() => schedulePush(0), 15000);
    }
  }
  function startListeners(uid) {
    stopListeners();
    cloud.unsub.push(cloud.adapter.listenDoc(['users', uid], (data) => applyRemoteCore(data)));
    cloud.unsub.push(cloud.adapter.listenCollection(['users', uid, 'foods'], (docs) => { for (const { data } of docs) applyRemoteFoods(data); }));
    cloud.unsub.push(cloud.adapter.listenCollection(['users', uid, 'logs'], (docs) => { for (const { data } of docs) applyRemoteLogs(data); }));
    cloud.unsub.push(cloud.adapter.listenCollection(['users', uid, 'workouts'], (docs) => { for (const { id, data } of docs) applyRemoteWorkouts(id, data); }));
  }
  function stopListeners() { for (const u of cloud.unsub) { try { u(); } catch {} } cloud.unsub = []; }
  function applyRemoteCore(data) {
    if (!data) return; const mt = data.mtimes || {}; let changed = false;
    for (const f of CORE) {
      const k = 'core:' + f;
      if (mt[f] != null && mt[f] > (sync.mtimes[k] || 0) && f in data) { state[f] = data[f] ?? (f === 'activeWorkout' ? null : state[f]); sync.mtimes[k] = mt[f]; snap[k] = JSON.stringify(state[f] ?? null); changed = true; }
    }
    if (changed) afterRemote();
  }
  function applyRemoteLogs(data) {
    if (!data) return; const mt = data.mtimes || {}; let changed = false;
    for (const d of Object.keys(mt)) {
      const k = 'log:' + d;
      if (mt[d] > (sync.mtimes[k] || 0)) { state.logs[d] = (data.days && data.days[d]) || {}; sync.mtimes[k] = mt[d]; snap[k] = JSON.stringify(state.logs[d]); changed = true; }
    }
    if (changed) afterRemote();
  }
  function applyRemoteFoods(data) {
    if (!data) return; const mt = data.mtimes || {}; let changed = false;
    for (const id of Object.keys(mt)) {
      const k = 'food:' + id;
      if (mt[id] > (sync.mtimes[k] || 0)) {
        const f = data.items ? data.items[id] : null;
        const i = state.foods.findIndex((x) => x.id === id);
        if (f) { if (i >= 0) state.foods[i] = f; else state.foods.unshift(f); snap[k] = JSON.stringify(f); }
        else { if (i >= 0) state.foods.splice(i, 1); delete snap[k]; }
        sync.mtimes[k] = mt[id]; changed = true;
      }
    }
    if (changed) afterRemote();
  }
  function applyRemoteWorkouts(month, data) {
    if (!data) return; const mt = data.mtimes || {}; let changed = false;
    for (const id of Object.keys(mt)) {
      const k = 'wk:' + id;
      if (mt[id] > (sync.mtimes[k] || 0)) {
        const w = data.items ? data.items[id] : null;
        state.workouts = state.workouts.filter((x) => x.id !== id);
        if (w) { state.workouts.push(w); snap[k] = JSON.stringify(w); wkMonths[id] = month; } else delete snap[k];
        sync.mtimes[k] = mt[id]; changed = true;
      }
    }
    if (changed) afterRemote();
  }
  function afterRemote() {
    localStorage.setItem(KEY, JSON.stringify(state)); saveSync();
    if (document.activeElement && document.activeElement.matches('input, select, textarea')) cloud.pendingRender = true; else render();
  }
  document.addEventListener('focusout', () => { if (cloud.pendingRender) { cloud.pendingRender = false; setTimeout(() => { if (!document.activeElement?.matches('input, select, textarea')) render(); else cloud.pendingRender = true; }, 50); } });
  window.addEventListener('online', () => { if (cloud.user) { setStatus('syncing'); schedulePush(0); } });
  window.addEventListener('offline', () => { if (cloud.user) setStatus('offline'); });

  async function initCloud() {
    const cfg = window.FUEL_LIFT_FIREBASE; const fake = window.__FUEL_LIFT_CLOUD;
    if (!cfg && !fake) { cloud.status = 'off'; return; }
    // Load the SDK right away only when this device has signed in before; otherwise wait until someone taps Sign in.
    if (fake || sync.uid || sync.everSignedIn) return ensureCloud();
    cloud.status = 'idle'; if (ui.tab === 'settings') render();
  }
  async function ensureCloud() {
    if (cloud.adapter) return true;
    if (cloud.loading) return cloud.loading;
    const cfg = window.FUEL_LIFT_FIREBASE; const fake = window.__FUEL_LIFT_CLOUD;
    cloud.status = 'loading'; if (ui.tab === 'settings') render();
    cloud.loading = (async () => {
      try { cloud.adapter = fake || await firebaseAdapter(cfg); } catch (e) { cloud.loading = null; setStatus('error', t('Could not load the sync module')); return false; }
      cloud.status = 'signedout';
      cloud.adapter.onAuth((user) => onAuthChange(user));
      if (ui.tab === 'settings') render();
      return true;
    })();
    return cloud.loading;
  }
  async function onAuthChange(user) {
    cloud.user = user;
    if (!user) { stopListeners(); clearTimeout(cloud.pushTimer); setStatus('signedout'); return; }
    if (!sync.everSignedIn) { sync.everSignedIn = true; saveSync(); }
    setStatus('syncing');
    if (sync.uid !== user.uid) await firstSignIn(user.uid);
    else { startListeners(user.uid); schedulePush(0); }
  }
  async function firstSignIn(uid) {
    const hasLocal = Object.values(sync.mtimes).some((v) => v > 0);
    let remote = null;
    try { remote = await cloud.adapter.getDoc(['users', uid]); } catch (e) { setStatus('error', describeErr(e)); return; }
    if (hasLocal && remote) { ui.modal = { type: 'syncChoice', uid }; renderModal(); return; }
    finishFirstSignIn(uid, hasLocal && !remote ? 'device' : 'cloud');
  }
  function finishFirstSignIn(uid, choice) {
    if (choice === 'device') { const now = Date.now(); for (const k of Object.keys(sectionValues())) { sync.mtimes[k] = now; cloud.dirty.add(k); } }
    else { const keepLang = state.settings.lang; state = defaultState(); state.settings.lang = keepLang; sync.mtimes = {}; for (const k of Object.keys(snap)) delete snap[k]; cloud.dirty.clear(); syncInitSnapshot(); localStorage.setItem(KEY, JSON.stringify(state)); render(); }
    sync.uid = uid; saveSync();
    startListeners(uid); schedulePush(0);
  }
  function describeErr(e) {
    const code = String((e && e.code) || '');
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(code)) return t('Wrong email or password');
    if (/email-already-in-use/.test(code)) return t('That email is already registered');
    if (/invalid-email/.test(code)) return t('That email looks invalid');
    if (/weak-password/.test(code)) return t('Password must be at least 6 characters');
    if (/too-many-requests/.test(code)) return t('Too many attempts, try again later');
    if (/network-request-failed|unavailable/.test(code)) return t('Network error, check your connection');
    if (/permission-denied/.test(code)) return t('Permission denied (check the Firestore rules)');
    return (e && e.message) || String(e);
  }
  async function authAction(kind) {
    const a = ui.auth; const email = a.email.trim(), pw = a.password;
    if (!email || !pw) return toast(t('Enter your email and password'));
    if (kind === 'signUp' && pw.length < 6) return toast(t('Password must be at least 6 characters'));
    cloud.busy = true; render();
    try { if (!(await ensureCloud())) return; await cloud.adapter[kind](email, pw); a.password = ''; toast(kind === 'signUp' ? t('Account created') : t('Welcome back!')); }
    catch (e) { toast(describeErr(e)); }
    finally { cloud.busy = false; if (ui.tab === 'settings') render(); }
  }
  async function firebaseAdapter(cfg) {
    const base = 'https://www.gstatic.com/firebasejs/10.14.1/';
    const [appM, authM, fsM] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
    const app = appM.initializeApp(cfg);
    const auth = authM.getAuth(app);
    let db; try { db = fsM.initializeFirestore(app, { localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() }) }); } catch { db = fsM.getFirestore(app); }
    const ref = (path) => (path.length % 2 === 0 ? fsM.doc(db, ...path) : fsM.collection(db, ...path));
    const onErr = (e) => setStatus('error', describeErr(e));
    return {
      onAuth: (cb) => authM.onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null)),
      signIn: (e, p) => authM.signInWithEmailAndPassword(auth, e, p),
      signUp: (e, p) => authM.createUserWithEmailAndPassword(auth, e, p),
      signOut: () => authM.signOut(auth),
      resetPassword: (e) => authM.sendPasswordResetEmail(auth, e),
      getDoc: async (path) => { const sn = await fsM.getDoc(ref(path)); return sn.exists() ? sn.data() : null; },
      setFields: (path, data, fields) => fsM.setDoc(ref(path), data, { mergeFields: fields.map((f) => new fsM.FieldPath(...f)) }),
      listenDoc: (path, cb) => fsM.onSnapshot(ref(path), (sn) => cb(sn.exists() ? sn.data() : null), onErr),
      listenCollection: (path, cb) => fsM.onSnapshot(ref(path), (qs) => cb(qs.docs.map((d) => ({ id: d.id, data: d.data() }))), onErr),
    };
  }
  function accountCard() {
    const a = ui.auth || (ui.auth = { email: '', password: '' });
    const st = cloud.status; let body;
    const statusLine = () => {
      if (st === 'error') return `<span class="dot err"></span>${esc(t('Sync error: {msg}', { msg: cloud.error }))}`;
      if (st === 'offline') return `<span class="dot warn"></span>${t('Offline. Changes will sync when you are back online.')}`;
      if (st === 'syncing') return `<span class="dot warn"></span>${t('Syncing…')}`;
      return `<span class="dot ok"></span>${t('Synced')}`;
    };
    if (st === 'off') body = `<p class="small muted">${t('Cloud sync is not set up for this copy of the app. See the README to connect a Firebase project.')}</p>`;
    else if (st === 'loading' && !cloud.busy) body = `<p class="small muted">${t('Loading…')}</p>`;
    else if (!cloud.user) body = `<div class="stack">
        <div class="grid-2">
          <div class="field"><label>${t('Email')}</label><input class="input" type="email" autocomplete="email" inputmode="email" data-field="auth-email" value="${esc(a.email)}" /></div>
          <div class="field"><label>${t('Password')}</label><input class="input" type="password" autocomplete="current-password" id="auth-password" data-field="auth-password" value="${esc(a.password)}" /></div>
        </div>
        ${st === 'error' ? `<p class="small" style="color:var(--danger)">${esc(cloud.error)}</p>` : ''}
        <div class="row wrap"><button class="btn primary sm" data-action="auth-signin" ${cloud.busy ? 'disabled' : ''}>${t('Sign in')}</button><button class="btn sm" data-action="auth-signup" ${cloud.busy ? 'disabled' : ''}>${t('Create account')}</button><span class="spacer"></span><button class="btn ghost sm" data-action="auth-reset">${t('Forgot password?')}</button></div>
      </div>`;
    else body = `<div class="row between wrap"><div class="row" style="gap:10px">${avatar()}<div><div style="font-weight:500">${userName() ? esc(userName()) + ' · ' : ''}${t('Signed in as {email}', { email: esc(cloud.user.email || '') })}</div><div class="small ${st === 'error' ? '' : 'muted'}" style="${st === 'error' ? 'color:var(--danger)' : ''}">${statusLine()}</div></div></div><button class="btn sm" data-action="auth-signout">${t('Sign out')}</button></div>`;
    return `<div class="card"><h2 style="margin-bottom:6px">${t('Account')}</h2><p class="small muted" style="margin-bottom:12px">${t('Your log, foods, routines and workouts follow you on every device where you sign in.')}</p>${body}</div>`;
  }
  const modalSyncChoice = () => `<div class="modal-head"><h2>${t('Which data should we keep?')}</h2></div><p style="color:var(--text-2)">${t('This device already has data, and your account also has data in the cloud. Pick one; the other copy is replaced.')}</p><div class="modal-foot" style="flex-direction:column"><button class="btn primary" data-action="sync-cloud">${t('Use cloud data')}</button><button class="btn" data-action="sync-device">${t('Use this device’s data')}</button></div>`;

  /* =========================== SETTINGS =========================== */
  function viewSettings() {
    const s = state.settings, g = s.goals, p = s.profile;
    const calc = calcGoals(p);
    return `
      <div class="page-head"><div><h1>${t('Settings')}</h1><div class="sub">${t('Goals, units and your data')}</div></div></div>
      <div class="card">
        <h2 style="margin-bottom:12px">${t('Daily goals')}</h2>
        <div class="grid-4">
          <div class="field"><label>${t('Calories')}</label><input class="input" type="number" inputmode="numeric" data-field="goal-kcal" value="${g.kcal}" /></div>
          <div class="field"><label>${t('Protein g')}</label><input class="input" type="number" inputmode="numeric" data-field="goal-p" value="${g.p}" /></div>
          <div class="field"><label>${t('Carbs g')}</label><input class="input" type="number" inputmode="numeric" data-field="goal-c" value="${g.c}" /></div>
          <div class="field"><label>${t('Fat g')}</label><input class="input" type="number" inputmode="numeric" data-field="goal-f" value="${g.f}" /></div>
        </div>
        <p class="small muted" style="margin-top:10px">${t('Macros add up to {n} kcal.', { n: fmtInt(g.p * 4 + g.c * 4 + g.f * 9) })}</p>
        <details class="collapse" style="margin-top:16px"><summary>${t('Calculate from my profile')}</summary>
          <div class="body">
            <div class="grid-3">
              <div class="field"><label>${t('Sex')}</label><select class="input" data-field="pf-sex"><option value="male" ${p.sex === 'male' ? 'selected' : ''}>${t('Male')}</option><option value="female" ${p.sex === 'female' ? 'selected' : ''}>${t('Female')}</option></select></div>
              <div class="field"><label>${t('Age')}</label><input class="input" type="number" inputmode="numeric" data-field="pf-age" value="${p.age}" /></div>
              <div class="field"><label>${t('Height cm')}</label><input class="input" type="number" inputmode="numeric" data-field="pf-height" value="${p.height}" /></div>
              <div class="field"><label>${t('Weight {u}', { u: unit() })}</label><input class="input" type="number" inputmode="decimal" data-field="pf-weight" value="${toDisplayW(p.weight)}" /></div>
              <div class="field"><label>${t('Activity')}</label><select class="input" data-field="pf-activity">${[[1.2, 'Sedentary'], [1.375, 'Light (1-3 d/wk)'], [1.55, 'Moderate (3-5 d/wk)'], [1.725, 'Active (6-7 d/wk)'], [1.9, 'Very active']].map(([v, l]) => `<option value="${v}" ${Number(p.activity) === v ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></div>
              <div class="field"><label>${t('Goal')}</label><select class="input" data-field="pf-goal">${[['cut', 'Lose fat (−500)'], ['maintain', 'Maintain'], ['bulk', 'Build muscle (+300)']].map(([v, l]) => `<option value="${v}" ${p.goal === v ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></div>
            </div>
            <div class="row between" style="margin-top:14px;flex-wrap:wrap">
              <div class="small muted">${t('Estimate:')} <b style="color:var(--text)">${fmtInt(calc.kcal)} kcal</b> · ${calc.p} P / ${calc.c} C / ${calc.f} ${lang() === 'es' ? 'G' : 'F'}</div>
              <button class="btn primary sm" data-action="apply-calc">${t('Use these goals')}</button>
            </div>
          </div></details>
      </div>
      <div class="card">
        <h2 style="margin-bottom:6px">${t('Preferences')}</h2>
        <div class="setting-row"><div><div class="lbl">${t('Your name')}</div><div class="desc">${t('Shown in the greeting and on your account')}</div></div><input class="input" style="width:150px" data-field="pf-name" value="${esc(p.name || '')}" placeholder="${t('e.g. David')}" autocomplete="given-name" /></div>
        <div class="setting-row"><div><div class="lbl">${t('Language')}</div></div><div class="seg"><button class="${s.lang === 'en' ? 'active' : ''}" data-action="set-lang" data-v="en">English</button><button class="${s.lang === 'es' ? 'active' : ''}" data-action="set-lang" data-v="es">Español</button></div></div>
        <div class="setting-row"><div><div class="lbl">${t('Weight units')}</div><div class="desc">${t('For body weight and lifts')}</div></div><div class="seg"><button class="${s.units === 'kg' ? 'active' : ''}" data-action="set-units" data-v="kg">kg</button><button class="${s.units === 'lb' ? 'active' : ''}" data-action="set-units" data-v="lb">lb</button></div></div>
        <div class="setting-row"><div><div class="lbl">${t('Rest timer')}</div><div class="desc">${t('Starts when you check a set. 0 to disable.')}</div></div><div class="input-suffix"><input class="input" type="number" inputmode="numeric" data-field="rest-seconds" value="${s.restSeconds}" /><span>${t('sec')}</span></div></div>
        <div class="setting-row"><div><div class="lbl">${t('Theme')}</div></div><div class="seg">${[['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button class="${s.theme === v ? 'active' : ''}" data-action="set-theme" data-v="${v}">${t(l)}</button>`).join('')}</div></div>
      </div>
      ${accountCard()}
      <div class="card">
        <h2 style="margin-bottom:6px">${t('Data')}</h2>
        <p class="small muted" style="margin-bottom:12px">${t('Everything lives in this browser. Export regularly to keep a backup or move devices.')}</p>
        <div class="row wrap"><button class="btn sm" data-action="export">${t('Export JSON')}</button><label class="btn sm" style="cursor:pointer">${t('Import JSON')}<input type="file" accept="application/json" data-field="import-file" hidden /></label><span class="spacer"></span><button class="btn danger sm" data-action="reset">${t('Reset all data')}</button></div>
      </div>`;
  }
  function calcGoals(p) {
    const w = Number(p.weight) || 70, h = Number(p.height) || 170, a = Number(p.age) || 30;
    const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === 'female' ? -161 : 5);
    let kcal = bmr * (Number(p.activity) || 1.55);
    kcal += p.goal === 'cut' ? -500 : p.goal === 'bulk' ? 300 : 0;
    kcal = Math.max(1200, Math.round(kcal / 10) * 10);
    const prot = Math.round(w * (p.goal === 'cut' ? 2.0 : 1.8));
    const fat = Math.round(kcal * 0.25 / 9);
    const carbs = Math.max(0, Math.round((kcal - prot * 4 - fat * 9) / 4));
    return { kcal, p: prot, c: carbs, f: fat };
  }

  /* =========================== Modal plumbing =========================== */
  function renderModal() {
    const root = $('#modal-root'), box = $('#modal');
    if (!ui.modal) { stopScanner(); root.hidden = true; box.innerHTML = ''; return; }
    const views = { addFood: modalAddFood, foodForm: modalFoodForm, routine: modalRoutine, exPicker: modalExPicker, confirm: modalConfirm, scan: modalScan, syncChoice: modalSyncChoice, saveMeal: modalSaveMeal };
    if (ui.modal.type !== 'scan') stopScanner();
    box.innerHTML = views[ui.modal.type]();
    root.hidden = false;
    if (ui.modal.type === 'scan') startScanner();
    const focus = $('#food-search, #ex-search, #meal-name, [autofocus]', box); if (focus && matchMedia('(min-width: 640px)').matches) { focus.focus(); if (focus.select) focus.select(); }
  }
  function closeModal() { ui.modal = null; renderModal(); }
  function confirm(title, text, onYes, yesLabel = t('Delete')) { ui.modal = { type: 'confirm', title, text, onYes, yesLabel, prev: ui.modal }; renderModal(); }
  const modalConfirm = () => `<div class="modal-head"><h2>${esc(ui.modal.title)}</h2></div><p style="color:var(--text-2)">${esc(ui.modal.text)}</p><div class="modal-foot"><button class="btn" data-action="confirm-no">${t('Cancel')}</button><button class="btn danger" data-action="confirm-yes">${esc(ui.modal.yesLabel)}</button></div>`;

  /* =========================== Events =========================== */
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action]'); if (!el) return;
    const a = el.dataset.action, d = el.dataset, m = ui.modal;
    const actions = {
      tab() { ui.tab = d.tab; history.replaceState(null, '', '#' + d.tab); window.scrollTo(0, 0); render(); },
      date() { ui.date = addDays(ui.date, Number(d.n)); render(); },
      'date-today'() { ui.date = dateKey(); render(); },
      'modal-close'() { if (m?.type === 'syncChoice') return; closeModal(); },
      // food
      'add-food'() { openAddFood(d.meal); },
      'pick-food'() { m.foodId = d.id || null; m.grams = null; renderModal(); },
      'food-chip'() { m.grams = Number(d.g); renderModal(); },
      'confirm-food'() {
        const f = modalFood(m); const grams = m.grams ?? f.serving ?? 100; if (!(grams > 0)) return toast(t('Enter an amount'));
        if (m.editId) {
          const src = state.logs[ui.date]?.[m.origMeal] || []; const old = src.find((e) => e.id === m.editId); if (!old) return closeModal();
          state.logs[ui.date][m.origMeal] = src.filter((e) => e.id !== m.editId);
          const mac = macrosFor(f, grams); (state.logs[ui.date][m.meal] = state.logs[ui.date][m.meal] || []).push({ ...old, grams, ...mac });
          save(); closeModal(); render(); toast(t('Updated')); return;
        }
        addEntry(m.meal, f, grams); closeModal(); render(); toast(t('Added {name}', { name: foodName(f) }));
      },
      'entry-edit'() { const e = (state.logs[ui.date]?.[d.meal] || []).find((x) => x.id === d.id); if (!e) return; ui.modal = { type: 'addFood', meal: d.meal, origMeal: d.meal, search: '', foodId: e.foodId || 'entry', grams: e.grams, editId: e.id, entry: e }; renderModal(); },
      'copy-meal'() { const src = state.logs[d.from]?.[d.meal] || []; if (!src.length) return; state.logs[ui.date] = state.logs[ui.date] || {}; const arr = state.logs[ui.date][d.meal] = state.logs[ui.date][d.meal] || []; for (const e of src) arr.push({ ...e, id: uid() }); save(); render(); toast(t('Copied {n} items', { n: src.length })); },
      'save-meal'() { const items = (state.logs[ui.date]?.[d.meal] || []).map(({ foodId, name, grams, kcal, p, c, f }) => ({ foodId, name, grams, kcal, p, c, f })); if (!items.length) return; ui.modal = { type: 'saveMeal', meal: d.meal, items, name: '' }; renderModal(); },
      'save-meal-confirm'() { const name = (m.name || '').trim(); if (!name) return toast(t('Name this meal')); state.meals.push({ id: uid(), name, items: m.items }); save(); closeModal(); toast(t('Meal saved')); },
      'add-saved-meal'() { const sm = state.meals.find((x) => x.id === d.id); if (!sm) return; state.logs[ui.date] = state.logs[ui.date] || {}; const arr = state.logs[ui.date][m.meal] = state.logs[ui.date][m.meal] || []; for (const e of sm.items) arr.push({ ...e, id: uid() }); save(); closeModal(); render(); toast(t('Copied {n} items', { n: sm.items.length })); },
      'del-saved-meal'() { confirm(t('Delete saved meal?'), '', () => { state.meals = state.meals.filter((x) => x.id !== d.id); save(); ui.modal = ui.modal.prev; renderModal(); }); },
      'off-search'() { offSearch(d.q); },
      'pick-off'() { const it = m.off && m.off.items[Number(d.i)]; if (!it) return; let f = it.barcode ? state.foods.find((x) => x.barcode === it.barcode) : null; if (!f) { f = { id: uid(), name: it.name, kcal: it.kcal, p: it.p, c: it.c, f: it.f, serving: it.serving || null, barcode: it.barcode || null, builtin: false }; state.foods.unshift(f); save(); } m.foodId = f.id; m.grams = null; renderModal(); },
      'entry-remove'() { const arr = state.logs[ui.date]?.[d.meal]; if (!arr) return; state.logs[ui.date][d.meal] = arr.filter((e) => e.id !== d.id); save(); render(); },
      'new-food'() { openFoodForm(null, d.meal ? { meal: d.meal } : null); },
      scan() { const rt = m?.type === 'addFood' ? { meal: m.meal } : m?.type === 'foodForm' ? m.returnTo : null; openScanner(rt); },
      'scan-manual'() { const v = $('#scan-manual').value; scan.handled = false; handleBarcode(v); },
      'lookup-code'() { openScanner({ meal: m.meal }); ui.modal.code = d.code; handleBarcode(d.code); },
      'edit-food'() { openFoodForm(d.id, null); },
      'ff-basis'() { if (el.disabled) return; m.basis = d.b; renderModal(); },
      'ff-save'() { saveFoodForm(); },
      'ff-delete'() { confirm(t('Delete food?'), t('Logged meals keep their values; only the library entry is removed.'), () => { state.foods = state.foods.filter((f) => f.id !== m.foodId); save(); closeModal(); render(); toast(t('Food deleted')); }); },
      // gym
      'new-routine'() { openRoutineEditor(null); },
      'edit-routine'() { openRoutineEditor(d.id); },
      'rt-remove'() { m.draft.exercises.splice(Number(d.i), 1); renderModal(); },
      'rt-move'() { if (el.disabled) return; const i = Number(d.i), j = i + Number(d.dir); const ex = m.draft.exercises; if (j < 0 || j >= ex.length) return; [ex[i], ex[j]] = [ex[j], ex[i]]; renderModal(); },
      reload() { location.reload(); },
      'rt-add-exercise'() { openExercisePicker((ex) => { ui.modal.draft.exercises.push({ exId: ex.id, sets: 3, reps: '8-12' }); renderModal(); }); },
      'rt-save'() { const dr = m.draft; if (!dr.name.trim()) return toast(t('Name your routine')); if (!dr.exercises.length) return toast(t('Add at least one exercise')); dr.name = dr.name.trim(); const i = state.routines.findIndex((r) => r.id === dr.id); if (i >= 0) { if (dr.name === routineName(state.routines[i])) dr.name = state.routines[i].name; state.routines[i] = dr; } else state.routines.push(dr); save(); closeModal(); render(); toast(t('Routine saved')); },
      'rt-delete'() { confirm(t('Delete routine?'), t('Past workouts are kept.'), () => { state.routines = state.routines.filter((r) => r.id !== m.routineId); save(); closeModal(); render(); }); },
      'picker-back'() { ui.modal = m.prev || null; renderModal(); },
      'pick-exercise'() { const ex = exById(d.id); const cb = m.onPick; ui.modal = m.prev || null; cb(ex); },
      'create-exercise'() { const name = m.search.trim(); if (!name) return; const ex = { id: uid(), name, muscle: 'Other', builtin: false }; state.exercises.push(ex); save(); const cb = m.onPick; ui.modal = m.prev || null; cb(ex); },
      'start-routine'() { startWorkout(state.routines.find((r) => r.id === d.id)); },
      'start-empty'() { startWorkout(null); },
      'repeat-workout'() { const w = state.workouts.find((x) => x.id === d.id); startWorkout({ id: w.routineId, name: w.name, exercises: w.exercises.map((e) => ({ exId: e.exId, sets: e.sets.length || 3, reps: e.target || '' })) }); },
      'delete-workout'() { confirm(t('Delete workout?'), t('This removes it from your history.'), () => { state.workouts = state.workouts.filter((w) => w.id !== d.id); save(); closeModal(); render(); }); },
      'toggle-set'() { const s = state.activeWorkout.exercises[d.ei].sets[d.si]; if (!s.done) { const prev = lastSetsFor(state.activeWorkout.exercises[d.ei].exId); if (s.reps == null && prev?.[d.si]?.reps) s.reps = prev[d.si].reps; if (s.weight == null && prev?.[d.si]?.weight) s.weight = prev[d.si].weight; } s.done = !s.done; save(); render(); if (s.done) startRest(); },
      'wk-add-set'() { const e = state.activeWorkout.exercises[d.ei]; const last = e.sets[e.sets.length - 1]; e.sets.push({ weight: last?.weight ?? null, reps: null, done: false }); save(); render(); },
      'wk-remove-set'() { const e = state.activeWorkout.exercises[d.ei]; if (e.sets.length > 1) e.sets.pop(); save(); render(); },
      'wk-remove-exercise'() { state.activeWorkout.exercises.splice(Number(d.ei), 1); save(); render(); },
      'wk-add-exercise'() { openExercisePicker((ex) => { const prev = lastSetsFor(ex.id); state.activeWorkout.exercises.push({ exId: ex.id, name: ex.name, muscle: ex.muscle, target: '', sets: Array.from({ length: 3 }, (_, i) => ({ weight: prev?.[i]?.weight ?? null, reps: null, done: false })) }); save(); renderModal(); render(); }); },
      'finish-workout'() { finishWorkout(); },
      'discard-workout'() { confirm(t('Discard workout?'), t('Nothing from this session will be saved.'), () => { state.activeWorkout = null; stopRest(); save(); closeModal(); render(); }, t('Discard')); },
      'rest-add'() { restEnd += 30000; tickRest(); },
      'rest-skip'() { stopRest(); },
      // progress
      'log-weight'() { const kg = fromDisplayW($('#weight-input').value); if (kg == null || kg <= 0) return toast(t('Enter your weight')); const td = dateKey(); const i = state.weights.findIndex((w) => w.date === td); if (i >= 0) state.weights[i].kg = kg; else state.weights.push({ date: td, kg }); state.settings.profile.weight = round(kg, 1); save(); render(); toast(t('Weight logged')); },
      // settings
      'apply-calc'() { state.settings.goals = calcGoals(state.settings.profile); save(); render(); toast(t('Goals updated')); },
      'set-units'() { state.settings.units = d.v; save(); render(); },
      'set-theme'() { state.settings.theme = d.v; save(); applyTheme(); render(); },
      'set-lang'() { state.settings.lang = d.v; save(); render(); },
      export() { const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const a2 = document.createElement('a'); a2.href = URL.createObjectURL(blob); a2.download = `fuel-lift-${dateKey()}.json`; a2.click(); setTimeout(() => URL.revokeObjectURL(a2.href), 1000); },
      reset() { confirm(t('Reset all data?'), t('Foods, logs, routines and workouts will be erased. Export first if you want a backup.') + (cloud.user ? ' ' + t('This device only. Your cloud data is kept; sign in again to get it back.') : ''), () => { const keepLang = state.settings.lang; if (cloud.user) { stopListeners(); clearTimeout(cloud.pushTimer); cloud.dirty.clear(); cloud.adapter.signOut().catch(() => {}); cloud.user = null; cloud.status = 'signedout'; } localStorage.removeItem(KEY); state = defaultState(); state.settings.lang = keepLang; sync.mtimes = {}; sync.uid = null; for (const k of Object.keys(snap)) delete snap[k]; syncInitSnapshot(); closeModal(); applyTheme(); render(); toast(t('Data reset')); }, t('Reset')); },
      'auth-signin'() { authAction('signIn'); },
      'auth-signup'() { authAction('signUp'); },
      'auth-reset'() { const email = ui.auth.email.trim(); if (!email) return toast(t('Enter your email first')); ensureCloud().then((okk) => okk && cloud.adapter.resetPassword(email)).then(() => cloud.adapter && toast(t('Password reset email sent'))).catch((e) => toast(describeErr(e))); },
      'auth-signout'() { cloud.adapter.signOut().then(() => toast(t('Signed out'))).catch((e) => toast(describeErr(e))); },
      'sync-cloud'() { const uid = m.uid; closeModal(); finishFirstSignIn(uid, 'cloud'); },
      'sync-device'() { const uid = m.uid; closeModal(); finishFirstSignIn(uid, 'device'); },
      'confirm-yes'() { const fn = m.onYes; fn(); },
      'confirm-no'() { ui.modal = m.prev || null; renderModal(); },
    };
    if (actions[a]) { ev.preventDefault(); actions[a](); }
  });

  // Live inputs: update state without a full re-render where focus matters.
  document.addEventListener('input', (ev) => {
    const el = ev.target.closest('[data-field]'); if (!el) return;
    const f = el.dataset.field, v = el.value, m = ui.modal;
    switch (f) {
      case 'food-search': m.search = v; $('#food-results').innerHTML = foodResultsHtml(v); break;
      case 'food-grams': { m.grams = num(v, 0); const food = modalFood(m); const mac = macrosFor(food, m.grams); $('#food-summary').innerHTML = summaryHtml(mac); $('[data-action=confirm-food]').textContent = m.editId ? t('Save') : t('Add {n} kcal', { n: fmtInt(mac.kcal) }); $$('.chip[data-action=food-chip]').forEach((c) => c.classList.toggle('active', Number(c.dataset.g) === m.grams)); break; }
      case 'food-meal': m.meal = v; break;
      case 'ff-name': m.draft.name = v; break;
      case 'ff-serving': m.draft.serving = v; { const b = $('[data-action=ff-basis][data-b=serving]'); if (b) b.disabled = !num(v, 0); } break;
      case 'ff-kcal': m.draft.kcal = v; break;
      case 'ff-p': m.draft.p = v; break;
      case 'ff-c': m.draft.c = v; break;
      case 'ff-f': m.draft.f = v; break;
      case 'library-search': ui.foodSearch = v; $('#library-list').innerHTML = foodLibraryList(libraryFiltered(v)); break;
      case 'ex-search': m.search = v; $('#ex-results').innerHTML = exerciseResultsHtml(v); break;
      case 'rt-name': m.draft.name = v; break;
      case 'rt-sets': m.draft.exercises[el.dataset.i].sets = Math.max(1, Math.round(num(v, 1))); break;
      case 'rt-reps': m.draft.exercises[el.dataset.i].reps = v; break;
      case 'set-weight': state.activeWorkout.exercises[el.dataset.ei].sets[el.dataset.si].weight = v === '' ? null : fromDisplayW(v); save(); break;
      case 'set-reps': state.activeWorkout.exercises[el.dataset.ei].sets[el.dataset.si].reps = v === '' ? null : Math.round(num(v, 0)); save(); break;
      case 'goal-kcal': state.settings.goals.kcal = Math.max(0, Math.round(num(v))); save(); break;
      case 'goal-p': state.settings.goals.p = Math.max(0, Math.round(num(v))); save(); break;
      case 'goal-c': state.settings.goals.c = Math.max(0, Math.round(num(v))); save(); break;
      case 'goal-f': state.settings.goals.f = Math.max(0, Math.round(num(v))); save(); break;
      case 'rest-seconds': state.settings.restSeconds = Math.max(0, Math.round(num(v))); save(); break;
      case 'pf-name': state.settings.profile.name = v; save(); break;
      case 'pf-sex': state.settings.profile.sex = v; save(); render(); break;
      case 'pf-age': state.settings.profile.age = num(v); save(); break;
      case 'pf-height': state.settings.profile.height = num(v); save(); break;
      case 'pf-weight': { const kg = fromDisplayW(v); if (kg) state.settings.profile.weight = kg; save(); break; }
      case 'pf-activity': state.settings.profile.activity = num(v); save(); render(); break;
      case 'pf-goal': state.settings.profile.goal = v; save(); render(); break;
      case 'auth-email': ui.auth.email = v; break;
      case 'meal-name': m.name = v; break;
      case 'progress-ex': ui.progressEx = v; render(); break;
      case 'auth-password': ui.auth.password = v; break;
    }
  });
  // Re-render settings estimate after typing in profile numeric fields (on blur, to keep focus while typing).
  document.addEventListener('change', (ev) => {
    const el = ev.target.closest('[data-field]'); if (!el) return;
    const f = el.dataset.field;
    if (['pf-name', 'pf-age', 'pf-height', 'pf-weight', 'goal-kcal', 'goal-p', 'goal-c', 'goal-f'].includes(f) && ui.tab === 'settings') render();
    if (f === 'import-file') {
      const file = el.files[0]; if (!file) return;
      file.text().then((txt) => {
        const s = JSON.parse(txt); if (!s || !s.settings || !s.foods) throw new Error('bad');
        confirm(t('Import this backup?'), t('Replaces current data with {d} logged days and {w} workouts.', { d: Object.keys(s.logs || {}).length, w: (s.workouts || []).length }), () => { localStorage.setItem(KEY, JSON.stringify(s)); state = load(); closeModal(); applyTheme(); render(); toast(t('Data imported')); }, t('Import'));
      }).catch(() => toast(t('That file is not a valid backup')));
    }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && ui.modal && ui.modal.type !== 'syncChoice') closeModal();
    if (ev.key === 'Enter' && ev.target.id === 'auth-password') $('[data-action=auth-signin]').click();
    if (ev.key === 'Enter' && ui.modal?.type === 'addFood' && ui.modal.foodId && ev.target.id === 'food-grams') $('[data-action=confirm-food]').click();
    if (ev.key === 'Enter' && ev.target.id === 'weight-input') $('[data-action=log-weight]').click();
    if (ev.key === 'Enter' && ev.target.id === 'scan-manual') { ev.preventDefault(); $('[data-action=scan-manual]').click(); }
    if (ev.key === 'Enter' && ev.target.id === 'meal-name') { ev.preventDefault(); $('[data-action=save-meal-confirm]').click(); }
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  /* =========================== Boot =========================== */
  const hashTab = location.hash.replace('#', '');
  if (TABS.some(([id]) => id === hashTab)) ui.tab = hashTab;
  else if (state.activeWorkout) ui.tab = 'gym';
  syncInitSnapshot();
  if (TEST) window.__FL = { get state() { return state; }, sync, cloud, snap };
  applyTheme();
  render();
  initCloud();
  if (!TEST && 'serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => { const w = reg.installing; if (!w) return; w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { const el = $('#toast'); el.innerHTML = `${t('New version available')} <button data-action="reload" style="margin-left:8px;font-weight:700;text-decoration:underline;color:inherit">${t('Reload')}</button>`; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), 12000); } }); });
    }).catch(() => {});
  }
  window.addEventListener('hashchange', () => { const tb = location.hash.replace('#', ''); if (TABS.some(([id]) => id === tb) && tb !== ui.tab) { ui.tab = tb; render(); } });
})();
