// Adopta un Frailejón - Demo self-contained
// NO usa backend, solo datos del catálogo existente + localStorage

// Datos de especies del catálogo canónico de Chagra
const ESPECIES_DATA = {
    grandiflora: {
        id: 'espeletia_grandiflora',
        nombre_comun: 'Frailejón Mayor',
        nombre_cientifico: 'Espeletia grandiflora Humb. & Bonpl.',
        familia_botanica: 'Asteraceae',
        altura_maxima_m: 2.0,
        crecimiento_anual_cm: 1.0,
        edad_maxima_anos: 200,
        altitud_optima: { min: 3200, max: 3800 },
        humedad_optima: 90,
        ph_suelo_optimo: { min: 4.5, max: 5.5 },
        region: 'Cordillera Oriental (Chingaza, Sumapaz, Cruz Verde)',
        floracion: 'Marzo - Mayo',
        rol_ecosistemico: 'Productor de biomasa, planta nodriza, captura de niebla'
    },
    argentea: {
        id: 'espeletia_argentea',
        nombre_comun: 'Frailejón Plateado',
        nombre_cientifico: 'Espeletia argentea Bonpl. & Humb.',
        familia_botanica: 'Asteraceae',
        altura_maxima_m: 1.5,
        crecimiento_anual_cm: 1.0,
        edad_maxima_anos: 150,
        altitud_optima: { min: 3200, max: 3800 },
        humedad_optima: 90,
        ph_suelo_optimo: { min: 4.5, max: 5.5 },
        region: 'Cordillera Oriental (Cruz Verde, Guatoc)',
        floracion: 'Febrero - Abril',
        rol_ecosistemico: 'Productor de biomasa, captura de agua de niebla, regulador hídrico'
    }
};

// Estado global del demo
let selectedSpecies = null;
let frailejonName = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    setupSpeciesSelection();
    setupAdoptionForm();
    loadFromLocalStorage();
});

function setupSpeciesSelection() {
    const options = document.querySelectorAll('.species-option');
    
    options.forEach(option => {
        option.addEventListener('click', () => {
            // Remover selección previa
            options.forEach(opt => opt.classList.remove('selected'));
            
            // Seleccionar actual
            option.classList.add('selected');
            selectedSpecies = option.dataset.species;
            
            // Mostrar formulario
            document.getElementById('adoptionForm').classList.add('visible');
            
            // Guardar en localStorage
            localStorage.setItem('frailejon_species', selectedSpecies);
        });
    });
}

function setupAdoptionForm() {
    const adoptBtn = document.getElementById('adoptBtn');
    const nameInput = document.getElementById('frailejonName');
    
    adoptBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        
        if (!name) {
            alert('Por favor, dale un nombre a tu frailejón');
            return;
        }
        
        if (name.length < 2) {
            alert('El nombre debe tener al menos 2 caracteres');
            return;
        }
        
        frailejonName = name;
        
        // Guardar en localStorage
        localStorage.setItem('frailejon_name', name);
        localStorage.setItem('frailejon_adopted_date', new Date().toISOString());
        
        // Generar timeline
        generateTimeline();
        
        // Mostrar timeline
        document.getElementById('timeline').classList.add('visible');
        
        // Scroll al timeline
        document.getElementById('timeline').scrollIntoView({ behavior: 'smooth' });
    });
    
    // Permitir Enter para adoptar
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            adoptBtn.click();
        }
    });
}

function loadFromLocalStorage() {
    const savedSpecies = localStorage.getItem('frailejon_species');
    const savedName = localStorage.getItem('frailejon_name');
    
    if (savedSpecies && savedName) {
        selectedSpecies = savedSpecies;
        frailejonName = savedName;
        
        // Restaurar UI
        const speciesOption = document.querySelector(`[data-species="${savedSpecies}"]`);
        if (speciesOption) {
            document.querySelectorAll('.species-option').forEach(opt => opt.classList.remove('selected'));
            speciesOption.classList.add('selected');
        }
        
        document.getElementById('adoptionForm').classList.add('visible');
        document.getElementById('frailejonName').value = savedName;
        
        // Regenerar timeline
        generateTimeline();
        document.getElementById('timeline').classList.add('visible');
    }
}

function calculateAgeAndHeight(currentHeightCm) {
    const species = ESPECIES_DATA[selectedSpecies];
    // Los frailejones crecen ~1 cm por año (dato científico)
    const ageYears = Math.round(currentHeightCm / species.crecimiento_anual_cm);
    return { age: ageYears, height: currentHeightCm };
}

function generateTimeline() {
    const species = ESPECIES_DATA[selectedSpecies];
    const profile = document.getElementById('frailejonProfile');
    const events = document.getElementById('timelineEvents');
    
    // Generar perfil
    const alturaActual = Math.random() * 50 + 10; // 10-60 cm aleatorio
    const { age, height } = calculateAgeAndHeight(alturaActual);
    
    profile.innerHTML = `
        <div class="frailejon-name">🌿 ${frailejonName}</div>
        <div style="text-align: center; color: #4a7a6e; margin-bottom: 15px;">
            <em>${species.nombre_cientifico}</em>
        </div>
        <div class="frailejon-stats">
            <div class="stat-card">
                <div class="stat-value">${age}</div>
                <div class="stat-label">Años de edad</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${height.toFixed(1)} cm</div>
                <div class="stat-label">Altura actual</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${species.altitud_optima.min}-${species.altitud_optima.max}</div>
                <div class="stat-label">Altitud óptima (msnm)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${species.humedad_optima}%</div>
                <div class="stat-label">Humedad óptima</div>
            </div>
        </div>
    `;
    
    // Generar eventos del timeline
    const timelineEvents = generateLifeEvents(species, age);
    
    events.innerHTML = timelineEvents.map(event => `
        <div class="timeline-event ${event.highlight ? 'event-highlight' : ''} ${event.soilClass || ''}">
            <div class="event-year">${event.year}</div>
            <div class="event-title">${event.title}</div>
            <div class="event-description">${event.description}</div>
        </div>
    `).join('');
}

function generateLifeEvents(species, currentAge) {
    const events = [];
    const adoptedDate = new Date(localStorage.getItem('frailejon_adopted_date') || new Date());
    const currentYear = adoptedDate.getFullYear();
    
    // Evento inicial: Adopción
    events.push({
        year: currentYear,
        title: '🎉 ¡Has adoptado a tu frailejón!',
        description: `${frailejonName} es un ${species.nombre_comun} de ${currentAge} años y ${calculateAgeAndHeight(currentAge * species.crecimiento_anual_cm).height.toFixed(1)} cm de altura. 
                    Vive en el páramo de Guatoc, a ${species.altitud_optima.min}-${species.altitud_optima.max} msnm, 
                    donde captura agua de niebla y regula el ciclo hídrico.`,
        highlight: true
    });
    
    // Eventos históricos basados en edad actual
    const birthYear = currentYear - currentAge;
    
    // Germinación (año 0)
    events.push({
        year: birthYear,
        title: '🌱 Germinación',
        description: `La semilla de ${frailejonName} germina en el suelo ácido del páramo (pH ${species.ph_suelo_optimo.min}-${species.ph_suelo_optimo.max}). 
                    Las plántulas son vulnerables y requieren alta humedad (${species.humedad_optima}%).`
    });
    
    // Primeros años (establecimiento)
    if (currentAge > 5) {
        events.push({
            year: birthYear + 5,
            title: '🌿 Primeras hojas verdaderas',
            description: `A los 5 años, ${frailejonName} ha establecido su roseta basal y comienza a capturar agua de niebla de manera eficiente. 
                        Sus hojas están adaptadas a la alta radiación UV del páramo.`,
            soilClass: 'event-soil-good'
        });
    }
    
    // Juventud (10 años)
    if (currentAge > 10) {
        events.push({
            year: birthYear + 10,
            title: '🔺 Formación del tallo',
            description: `A la década, ${frailejonName} comienza a desarrollar su tallo característico. 
                        Ha crecido ~10 cm a un ritmo de 1 cm/año, adaptación extrema a las condiciones del páramo.`
        });
    }
    
    // Adolescencia (20 años)
    if (currentAge > 20) {
        events.push({
            year: birthYear + 20,
            title: '✨ Planta nodriza emergente',
            description: `A los 20 años, ${frailejonName} se convierte en planta nodriza. Su base protege a otras especies del páramo 
                        y sus hojas muertas crean microhábitats para insectos y musgos.`,
            highlight: true
        });
    }
    
    // Madurez (50 años)
    if (currentAge > 50) {
        events.push({
            year: birthYear + 50,
            title: '🌟 Madurez reproductiva',
            description: `Medio siglo de vida. ${frailejonName} alcanza la madurez reproductiva y produce inflorescencias con 
                        miles de flores amarillas durante ${species.floracion}. Polinizadores nativos visitan sus capítulos.`
        });
    }
    
    // Adulto (100 años)
    if (currentAge > 100) {
        events.push({
            year: birthYear + 100,
            title: '🏆 Centenario del páramo',
            description: `¡Un siglo de vida! ${frailejonName} es un gigante del páramo, con 1 metro de altura. 
                        Ha capturado toneladas de agua de niebla y protegido cientos de plantas bajo su sombra.`,
            highlight: true
        });
    }
    
    // Superviviente (150+ años para grandiflora)
    if (currentAge > 150 && species.id === 'espeletia_grandiflora') {
        events.push({
            year: birthYear + 150,
            title: '💪 Superviviente centenario',
            description: `Ciento cincuenta años adaptándose al cambio climático. ${frailejonName} ha sobrevivido heladas extremas 
                        (-${species.temperatura_helada_letal || 15}°C) y períodos de sequía, manteniendo la salud del ecosistema.`
        });
    }
    
    // Eventos futuros (proyecciones)
    const adultAge = Math.min(100, species.edad_maxima_anos);
    const adulthoodYear = currentYear + (adultAge - currentAge);
    
    if (adulthoodYear > currentYear + 10) {
        events.push({
            year: adulthoodYear,
            title: '🔮 Proyección: Madurez plena',
            description: `Se proyecta que ${frailejonName} alcanzará su altura máxima (${species.altura_maxima_m}m) 
                        alrededor de ${adulthoodYear}. Será un pilar del ecosistema del páramo de Guatoc.`,
            highlight: true
        });
    }
    
    // Ordenar eventos por año
    events.sort((a, b) => a.year - b.year);
    
    return events;
}

// Función para resetear el demo (útil para testing)
function resetDemo() {
    localStorage.removeItem('frailejon_species');
    localStorage.removeItem('frailejon_name');
    localStorage.removeItem('frailejon_adopted_date');
    location.reload();
}

// Hacer disponible globalmente para testing
window.frailejonDemo = {
    ESPECIES_DATA,
    calculateAgeAndHeight,
    generateLifeEvents,
    resetDemo
};
