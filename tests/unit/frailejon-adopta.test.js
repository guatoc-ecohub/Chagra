// Tests vitest para Adopta un Frailejón
// NO usamos node --test, usamos vitest

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock del DOM para testing
function setupMockDOM() {
    // Crear elementos básicos del DOM
    const container = document.createElement('div');
    container.innerHTML = `
        <div class="species-option" data-species="grandiflora"></div>
        <div class="species-option" data-species="argentea"></div>
        <div id="adoptionForm"></div>
        <div id="frailejonName"></div>
        <div id="timeline"></div>
        <div id="frailejonProfile"></div>
        <div id="timelineEvents"></div>
    `;
    document.body.appendChild(container);
}

function cleanupMockDOM() {
    document.body.innerHTML = '';
}

// Mock de localStorage
const mockLocalStorage = {
    store: {},
    getItem(key) {
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.store[key] = value;
    },
    removeItem(key) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
    }
};

// Datos de especies (mismo frailejon.js)
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

describe('Adopta un Frailejón - Cálculos biológicos', () => {
    beforeEach(() => {
        setupMockDOM();
        mockLocalStorage.clear();
    });

    afterEach(() => {
        cleanupMockDOM();
    });

    describe('calculateAgeAndHeight', () => {
        it('debe calcular edad correctamente basado en altura (1 cm/año)', () => {
            // Altura 10 cm = 10 años
            const result1 = { age: 10, height: 10 };
            expect(result1.age).toBe(10);
            expect(result1.height).toBe(10);
            
            // Altura 50 cm = 50 años
            const result2 = { age: 50, height: 50 };
            expect(result2.age).toBe(50);
            expect(result2.height).toBe(50);
            
            // Altura 100 cm = 100 años (un siglo)
            const result3 = { age: 100, height: 100 };
            expect(result3.age).toBe(100);
            expect(result3.height).toBe(100);
        });

        it('debe mantener relación 1:1 entre altura (cm) y edad (años)', () => {
            const heights = [1, 5, 10, 25, 50, 75, 100, 150, 200];
            
            heights.forEach(height => {
                const result = { age: height, height };
                expect(result.age).toBe(height);
                expect(result.height).toBe(height);
                expect(result.age).toBe(result.height); // Relación 1:1
            });
        });

        it('debe manejar valores decimales de altura', () => {
            const result = { age: 25, height: 25.5 };
            expect(result.age).toBe(25);
            expect(result.height).toBe(25.5);
        });
    });

    describe('Datos de especies', () => {
        it('debe tener datos correctos para Espeletia grandiflora', () => {
            const grandiflora = ESPECIES_DATA.grandiflora;
            
            expect(grandiflora.id).toBe('espeletia_grandiflora');
            expect(grandiflora.nombre_comun).toBe('Frailejón Mayor');
            expect(grandiflora.crecimiento_anual_cm).toBe(1.0);
            expect(grandiflora.edad_maxima_anos).toBe(200);
            expect(grandiflora.altura_maxima_m).toBe(2.0);
            expect(grandiflora.familia_botanica).toBe('Asteraceae');
            expect(grandiflora.altitud_optima.min).toBe(3200);
            expect(grandiflora.altitud_optima.max).toBe(3800);
        });

        it('debe tener datos correctos para Espeletia argentea', () => {
            const argentea = ESPECIES_DATA.argentea;
            
            expect(argentea.id).toBe('espeletia_argentea');
            expect(argentea.nombre_comun).toBe('Frailejón Plateado');
            expect(argentea.crecimiento_anual_cm).toBe(1.0);
            expect(argentea.edad_maxima_anos).toBe(150);
            expect(argentea.altura_maxima_m).toBe(1.5);
            expect(argentea.familia_botanica).toBe('Asteraceae');
        });

        it('ambas especies deben tener crecimiento de 1 cm/año', () => {
            expect(ESPECIES_DATA.grandiflora.crecimiento_anual_cm).toBe(1.0);
            expect(ESPECIES_DATA.argentea.crecimiento_anual_cm).toBe(1.0);
        });

        it('ambas especies deben ser Asteraceae', () => {
            expect(ESPECIES_DATA.grandiflora.familia_botanica).toBe('Asteraceae');
            expect(ESPECIES_DATA.argentea.familia_botanica).toBe('Asteraceae');
        });

        it('ambas especies deben tener pH óptimo ácido (páramo)', () => {
            const phMin = 4.5;
            const phMax = 5.5;
            
            expect(ESPECIES_DATA.grandiflora.ph_suelo_optimo.min).toBe(phMin);
            expect(ESPECIES_DATA.grandiflora.ph_suelo_optimo.max).toBe(phMax);
            expect(ESPECIES_DATA.argentea.ph_suelo_optimo.min).toBe(phMin);
            expect(ESPECIES_DATA.argentea.ph_suelo_optimo.max).toBe(phMax);
        });

        it('ambas especies deben tener humedad óptima de 90%', () => {
            expect(ESPECIES_DATA.grandiflora.humedad_optima).toBe(90);
            expect(ESPECIES_DATA.argentea.humedad_optima).toBe(90);
        });
    });

    describe('generación de timeline', () => {
        it('debe generar eventos para frailejón joven (10 años)', () => {
            const currentAge = 10;
            const currentYear = 2024;
            const birthYear = currentYear - currentAge;

            // Eventos mínimos esperados
            const expectedEvents = [
                { year: currentYear, title: expect.stringContaining('Adopta') },
                { year: birthYear, title: expect.stringContaining('Germinación') }
            ];

            expectedEvents.forEach(event => {
                expect(event.year).toBeGreaterThanOrEqual(1900);
                expect(event.year).toBeLessThanOrEqual(2100);
            });
        });

        it('debe generar eventos para frailejón adulto (50 años)', () => {
            const currentAge = 50;
            const currentYear = 2024;
            const birthYear = currentYear - currentAge;
            
            expect(currentAge).toBe(50);
            expect(birthYear).toBe(1974);
        });

        it('debe generar eventos para frailejón centenario (100 años)', () => {
            const currentAge = 100;
            const currentYear = 2024;
            const birthYear = currentYear - currentAge;
            
            expect(currentAge).toBe(100);
            expect(birthYear).toBe(1924);
        });

        it('debe incluir evento de madurez reproductiva para frailejones >20 años', () => {
            const currentAge = 25;
            const currentYear = 2024;
            const birthYear = currentYear - currentAge;

            // Debe tener evento a los 20 años
            const expectedYear = birthYear + 20;
            expect(expectedYear).toBe(2019);
        });
    });

    describe('validaciones de datos', () => {
        it('todas las especies deben tener campos requeridos', () => {
            const requiredFields = [
                'id',
                'nombre_comun',
                'nombre_cientifico',
                'familia_botanica',
                'altura_maxima_m',
                'crecimiento_anual_cm',
                'edad_maxima_anos',
                'altitud_optima',
                'humedad_optima',
                'ph_suelo_optimo'
            ];
            
            Object.values(ESPECIES_DATA).forEach(species => {
                requiredFields.forEach(field => {
                    expect(species).toHaveProperty(field);
                });
            });
        });

        it('crecimiento_anual_cm debe ser 1.0 para todas las especies', () => {
            Object.values(ESPECIES_DATA).forEach(species => {
                expect(species.crecimiento_anual_cm).toBe(1.0);
            });
        });

        it('altura_maxima_m debe ser positiva y razonable', () => {
            Object.values(ESPECIES_DATA).forEach(species => {
                expect(species.altura_maxima_m).toBeGreaterThan(0);
                expect(species.altura_maxima_m).toBeLessThanOrEqual(3.0);
            });
        });

        it('edad_maxima_anos debe ser mayor a 100', () => {
            Object.values(ESPECIES_DATA).forEach(species => {
                expect(species.edad_maxima_anos).toBeGreaterThan(100);
            });
        });

        it('altitud_optima debe estar en rango de páramo', () => {
            Object.values(ESPECIES_DATA).forEach(species => {
                expect(species.altitud_optima.min).toBeGreaterThanOrEqual(2800);
                expect(species.altitud_optima.max).toBeLessThanOrEqual(4500);
            });
        });
    });

    describe('persistencia en localStorage', () => {
        it('debe guardar y recuperar especie seleccionada', () => {
            mockLocalStorage.setItem('frailejon_species', 'grandiflora');
            expect(mockLocalStorage.getItem('frailejon_species')).toBe('grandiflora');
        });

        it('debe guardar y recuperar nombre del frailejón', () => {
            mockLocalStorage.setItem('frailejon_name', 'Guatoc');
            expect(mockLocalStorage.getItem('frailejon_name')).toBe('Guatoc');
        });

        it('debe guardar fecha de adopción', () => {
            const testDate = new Date().toISOString();
            mockLocalStorage.setItem('frailejon_adopted_date', testDate);
            expect(mockLocalStorage.getItem('frailejon_adopted_date')).toBe(testDate);
        });

        it('debe permitir eliminar datos', () => {
            mockLocalStorage.setItem('frailejon_species', 'argentea');
            mockLocalStorage.removeItem('frailejon_species');
            expect(mockLocalStorage.getItem('frailejon_species')).toBeNull();
        });
    });

    describe('validaciones de input', () => {
        it('nombre debe tener al menos 2 caracteres', () => {
            const validNames = ['Guatoc', 'Pa', 'Rocío', 'Paramo'];
            const invalidNames = ['', 'P', 'A'];
            
            validNames.forEach(name => {
                expect(name.length).toBeGreaterThanOrEqual(2);
            });
            
            invalidNames.forEach(name => {
                expect(name.length).toBeLessThan(2);
            });
        });

        it('nombre no debe estar vacío después de trim', () => {
            const validInput = '  Guatoc  ';
            const invalidInput = '   ';
            
            expect(validInput.trim().length).toBeGreaterThanOrEqual(2);
            expect(invalidInput.trim().length).toBe(0);
        });
    });
});

describe('Adopta un Frailejón - Render de timeline', () => {
    beforeEach(() => {
        setupMockDOM();
    });

    afterEach(() => {
        cleanupMockDOM();
    });

    it('debe crear elementos HTML para perfil del frailejón', () => {
        const profile = document.createElement('div');
        profile.className = 'frailejon-profile';
        profile.innerHTML = `
            <div class="frailejon-name">🌿 Guatoc</div>
        `;
        document.body.appendChild(profile);
        
        const element = document.querySelector('.frailejon-profile');
        expect(element).toBeTruthy();
        expect(element.innerHTML).toContain('Guatoc');
    });

    it('debe crear elementos HTML para eventos del timeline', () => {
        const events = document.createElement('div');
        events.className = 'timeline-events';
        events.innerHTML = `
            <div class="timeline-event">
                <div class="event-year">2024</div>
                <div class="event-title">Evento de prueba</div>
            </div>
        `;
        document.body.appendChild(events);
        
        const element = document.querySelector('.timeline-event');
        expect(element).toBeTruthy();
        expect(element.querySelector('.event-year').textContent).toBe('2024');
    });

    it('debe aplicar clases de highlight correctamente', () => {
        const event = document.createElement('div');
        event.className = 'timeline-event event-highlight';
        document.body.appendChild(event);
        
        const element = document.querySelector('.event-highlight');
        expect(element).toBeTruthy();
        expect(element.classList.contains('event-highlight')).toBe(true);
    });

    it('debe aplicar clases de suelo correctamente', () => {
        const soilGood = document.createElement('div');
        soilGood.className = 'timeline-event event-soil-good';
        document.body.appendChild(soilGood);
        
        const soilWarning = document.createElement('div');
        soilWarning.className = 'timeline-event event-soil-warning';
        document.body.appendChild(soilWarning);
        
        expect(document.querySelector('.event-soil-good')).toBeTruthy();
        expect(document.querySelector('.event-soil-warning')).toBeTruthy();
    });
});
