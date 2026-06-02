import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export function useMaintenanceSchedule() {
  const [schedule, setSchedule] = useState(() => {
    try {
      const stored = localStorage.getItem('ernoc_maintenance_schedule');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse stored schedule', error);
      return [];
    }
  });

  const [lastUploadDate, setLastUploadDate] = useState(() => {
    return localStorage.getItem('ernoc_maintenance_upload_date') || null;
  });

  const saveSchedule = (newSchedule) => {
    setSchedule(newSchedule);
    localStorage.setItem('ernoc_maintenance_schedule', JSON.stringify(newSchedule));
    const now = new Date().toISOString();
    setLastUploadDate(now);
    localStorage.setItem('ernoc_maintenance_upload_date', now);
  };

  const clearSchedule = () => {
    setSchedule([]);
    setLastUploadDate(null);
    localStorage.removeItem('ernoc_maintenance_schedule');
    localStorage.removeItem('ernoc_maintenance_upload_date');
  };

  const parseFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          const jsonRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(20, jsonRaw.length); i++) {
            const row = jsonRaw[i];
            if (!row) continue;
            const rowStr = row.join(' ').toLowerCase();
            if ((rowStr.includes('interno') || rowStr.includes('bus')) && rowStr.includes('ppu')) {
              headerRowIndex = i;
              break;
            }
          }

          if (headerRowIndex === -1) {
            throw new Error('No se encontraron las columnas esperadas (N° interno, PPU, etc). Revisa el formato del archivo.');
          }

          const parsedData = XLSX.utils.sheet_to_json(worksheet, { 
            range: headerRowIndex,
            raw: true
          });

          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const isSameDay = (d1, d2) => 
            d1.getDate() === d2.getDate() && 
            d1.getMonth() === d2.getMonth() && 
            d1.getFullYear() === d2.getFullYear();

          const parseDateValue = (val) => {
            if (!val) return null;
            if (val instanceof Date) return val;
            if (typeof val === 'number') {
              // Excel date fallback
              return new Date((val - 25569) * 86400 * 1000);
            }
            if (typeof val === 'string') {
              const parts = val.split(/[-/]/);
              if (parts.length >= 3) {
                 const d = parseInt(parts[0], 10);
                 const m = parseInt(parts[1], 10) - 1;
                 let y = parseInt(parts[2], 10);
                 if (y < 100) y += 2000;
                 return new Date(y, m, d);
              }
            }
            return null;
          };

          // Recolectar todas las fechas válidas para inferir cuál es "Día" y cuál "Noche"
          // La fecha menor será Noche, la mayor será Día (según el formato de sus planillas)
          const validDates = [];
          for (const row of parsedData) {
            const keys = Object.keys(row);
            const fechaKey = keys.find(k => k.toLowerCase().includes('fecha programada de ingreso') || k.toLowerCase().includes('fecha ingreso'));
            if (fechaKey && row[fechaKey]) {
              const d = parseDateValue(row[fechaKey]);
              if (d && !validDates.some(vd => isSameDay(vd, d))) {
                validDates.push(d);
              }
            }
          }
          
          validDates.sort((a, b) => a.getTime() - b.getTime());
          const dateNoche = validDates.length > 0 ? validDates[0] : null;
          const dateDia = validDates.length > 1 ? validDates[1] : null;

          const newSchedule = [];

          for (const row of parsedData) {
            const getCol = (possibleNames) => {
               const key = Object.keys(row).find(k => 
                  possibleNames.some(n => k.toLowerCase().includes(n.toLowerCase()))
               );
               return key ? row[key] : null;
            };

            const codRaw = getCol(['N° interno', 'interno Bus', 'Nro interno']);
            const ppuRaw = getCol(['PPU']);
            const tallerRaw = getCol(['Taller']);
            const detalleRaw = getCol(['DETALLE', 'MANTENIMIENTO']);
            const fechaRaw = getCol(['Fecha programada de ingreso', 'Fecha ingreso']);

            if (!codRaw || !ppuRaw) continue;

            const cod = codRaw.toString().trim();
            const ppu = ppuRaw.toString().trim();
            const taller = tallerRaw?.toString().trim() || '';
            const detalle = detalleRaw?.toString().trim() || '';
            
            const parsedDate = parseDateValue(fechaRaw);
            let tipoTurno = null;
            
            if (parsedDate && dateNoche) {
               if (isSameDay(parsedDate, dateNoche)) {
                 tipoTurno = 'Mantención noche';
               } else if (dateDia && isSameDay(parsedDate, dateDia)) {
                 tipoTurno = 'Mantención día';
               } else {
                 // Si hay una tercera fecha extraña, la ponemos como noche por defecto
                 tipoTurno = 'Mantención noche';
               }
            } else {
               // Si no pudo parsear la fecha, intentamos forzar por nombre o ignorar
               // Para debuggear, podemos logear
               console.warn("Fecha no parseable para bus", cod, ":", fechaRaw);
            }

            if (tipoTurno) {
              let terminal = '';
              if (taller?.toUpperCase().includes('EL ROBLE')) terminal = 'El Roble';
              else if (taller?.toUpperCase().includes('LA REINA')) terminal = 'La Reina';

              newSchedule.push({
                cod,
                ppu,
                terminal,
                detalle,
                turno: tipoTurno,
                fechaProgramada: parsedDate ? parsedDate.toISOString() : null
              });
            }
          }

          saveSchedule(newSchedule);
          resolve(newSchedule);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('Error leyendo el archivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  return {
    schedule,
    lastUploadDate,
    parseFile,
    clearSchedule
  };
}
