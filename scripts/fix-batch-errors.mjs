#!/usr/bin/env node

/**
 * Script para corregir errores de validación en las species agregadas
 */

import fs from 'fs';

const CATALOG_PATH = './catalog/chagra-catalog-oss-subset-v3.2.json';

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));

// Mapeos de roles inválidos a válidos
const roleMap = {
  'shade_lover': null, // Eliminar
  'forage': 'crop', // Mapear a crop
  'medicinal': null, // Eliminar (la categoría ya indica medicinal)
  'ornamental': 'pollinator_attractor' // Mapear a pollinator_attractor si tiene flores
};

let fixedCount = 0;

catalog.species.forEach(species => {
  let modified = false;
  
  // Corregir roles_in_guild
  if (species.roles_in_guild) {
    species.roles_in_guild = species.roles_in_guild.filter(role => {
      if (roleMap.hasOwnProperty(role)) {
        if (roleMap[role] === null) {
          return false; // Eliminar
        } else {
          return roleMap[role]; // Reemplazar (aunque filter no puede hacer esto)
        }
      }
      return true;
    });
    
    // Si necesitamos reemplazar (no solo filtrar), lo hacemos en loop separado
    species.roles_in_guild = species.roles_in_guild.map(role => {
      return roleMap[role] || role;
    }).filter((role, index, self) => self.indexOf(role) === index); // Eliminar duplicados
    
    if (species.roles_in_guild.length === 0) {
      species.roles_in_guild = ['crop'];
    }
    modified = true;
  }
  
  // Agregar cultivable si falta
  if (!species.hasOwnProperty('cultivar')) {
    species.cultivar = false;
    modified = true;
  }
  
  if (!species.hasOwnProperty('cultivable')) {
    // Especies invasoras no son cultivables
    if (species.category === 'especies_invasoras') {
      species.cultivable = false;
    } else {
      species.cultivable = true;
    }
    modified = true;
  }
  
  // Agregar estrato si falta en especies que lo requieren
  if (species.category === 'especies_invasoras' && !species.estrato) {
    species.estrato = 'medio';
    modified = true;
  }
  
  if (species.category === 'arboles_sombra' && !species.estrato) {
    species.estrato = 'alto';
    modified = true;
  }
  
  if (modified) {
    fixedCount++;
  }
});

// Guardar catálogo corregido
fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');

console.log(`[INFO] Corregidas ${fixedCount} species`);
console.log(`[SUCCESS] Catálogo actualizado: ${catalog.species.length} species totales`);

