import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

/**
 * Category tags detected from the "detalle" field of each maintenance entry.
 * These are used for filtering, inspector workflows, and future modules.
 */
const CATEGORY_PATTERNS = [
  { key: 'rtg',    label: 'Planta RTG',  color: 'danger',  patterns: ['planta de rtg', 'envio a planta', 'envío a planta'] },
  { key: 'applus', label: 'APPLUS',      color: 'warning', patterns: ['applus'] },
  { key: 'dtpm',   label: 'DTPM',        color: 'info',    patterns: ['dtpm'] },
  { key: 'rechazo',label: 'Rechazo',     color: 'danger',  patterns: ['rechazo'] },
  { key: 'rev_tec',label: 'Rev. Técnica',color: 'purple',  patterns: ['revisión técnica', 'revision tecnica', 'rev tecnica', 'rev. tecnica'] },
  { key: 'gases',  label: 'Gases',       color: 'muted',   patterns: ['gases'] },
];

function detectCategories(detalle) {
  if (!detalle) return [];
  const lower = detalle.toLowerCase();
  return CATEGORY_PATTERNS
    .filter((cat) => cat.patterns.some((p) => lower.includes(p)))
    .map((cat) => ({ key: cat.key, label: cat.label, color: cat.color }));
}

export function useMaintenanceSchedule() {
  const [schedule, setSchedule] = useState([]);
  const [lastUploadDate, setLastUploadDate] = useState(null);

  const fetchSchedule = async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.from('maintenance_records').select('*');
    if (!error && data) {
      const records = data.map((d) => ({
        ...d.raw_data,
        id: d.id,
        numeroOT: d.numero_ot || d.raw_data.numeroOT,
        horaLlegada: d.hora_llegada || d.raw_data.horaLlegada,
      }));
      setSchedule(records);
      if (data.length > 0) {
        setLastUploadDate(data[0].created_at);
      } else {
        setLastUploadDate(null);
      }
    }
  };

  useEffect(() => {
    fetchSchedule();

    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel(`maint_sync_${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, () => {
        fetchSchedule();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const saveSchedule = async (newSchedule) => {
    if (!isSupabaseConfigured) {
      console.warn('Supabase no configurado');
      return;
    }
    setSchedule(newSchedule); // Optimistic

    try {
      await supabase.from('maintenance_records').delete().neq('ppu', 'impossible_delete_all');

      const payload = newSchedule.map((s) => ({
        ppu: s.ppu,
        cod: s.cod,
        fecha: s.fechaProgramada,
        detalle: s.detalle,
        numero_ot: s.numeroOT,
        hora_llegada: s.horaLlegada,
        raw_data: s,
      }));

      await supabase.from('maintenance_records').insert(payload);
    } catch (error) {
      console.error('Error subiendo mantenciones:', error);
    }
  };

  const clearSchedule = async () => {
    setSchedule([]);
    setLastUploadDate(null);
    if (isSupabaseConfigured) {
      await supabase.from('maintenance_records').delete().neq('ppu', 'impossible_delete_all');
    }
  };

  const updateEntry = async (id, patch) => {
    if (!isSupabaseConfigured) return;
    setSchedule((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

    const dbPatch = {};
    if (patch.numeroOT !== undefined) dbPatch.numero_ot = patch.numeroOT;
    if (patch.horaLlegada !== undefined) dbPatch.hora_llegada = patch.horaLlegada;
    
    // Also patch raw_data slightly to avoid inconsistencies if raw_data is read directly
    const targetItem = schedule.find((s) => s.id === id);
    if (targetItem) {
      dbPatch.raw_data = { ...targetItem, ...patch };
    }

    try {
      await supabase.from('maintenance_records').update(dbPatch).eq('id', id);
    } catch (err) {
      console.error('Error actualizando mantención:', err);
    }
  };

  const parseFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const parsedData = [];

          // Encontrar la hoja correcta: El usuario indica que la hoja se llama igual que la fecha (ej: 05-06-2026)
          // Buscamos hojas que tengan formato de fecha (DD-MM o DD-MM-YYYY)
          const dateSheetRegex = /^(\d{2})[-/.](\d{2})(?:[-/.](\d{2,4}))?/;
          const dateSheets = workbook.SheetNames.filter(name => dateSheetRegex.test(name.trim()));
          
          let targetSheets = [];
          if (dateSheets.length > 0) {
            // Si hay hojas con fechas, asumimos que la última de ellas es la más reciente o la que el usuario quiere ver
            targetSheets = [dateSheets[dateSheets.length - 1]];
          } else if (workbook.SheetNames.length > 0) {
            // Fallback extremo si ninguna hoja tiene fecha
            targetSheets = [workbook.SheetNames[workbook.SheetNames.length - 1]];
          }

          for (const sheetName of targetSheets) {
            const worksheet = workbook.Sheets[sheetName];
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

            if (headerRowIndex !== -1) {
              const sheetData = XLSX.utils.sheet_to_json(worksheet, { 
                range: headerRowIndex,
                raw: true
              });
              parsedData.push(...sheetData);
            }
          }

          if (parsedData.length === 0) {
            throw new Error('No se encontraron las columnas esperadas (N° interno, PPU, etc) en ninguna hoja.');
          }

          const parseDateValue = (val) => {
            if (!val) return null;
            
            // SheetJS with cellDates: true creates Dates in UTC matching the exact Excel display.
            if (val instanceof Date) {
              return {
                 dateObj: val, // We keep the UTC offset handling clean
                 year: val.getUTCFullYear(),
                 month: val.getUTCMonth(),
                 day: val.getUTCDate(),
                 hour: val.getUTCHours(),
                 min: val.getUTCMinutes()
              };
            }
            
            // Excel serial date (e.g. 45367.916666)
            if (typeof val === 'number') {
              const utcDate = new Date((val - 25569) * 86400 * 1000);
              return {
                 dateObj: utcDate,
                 year: utcDate.getUTCFullYear(),
                 month: utcDate.getUTCMonth(),
                 day: utcDate.getUTCDate(),
                 hour: utcDate.getUTCHours(),
                 min: utcDate.getUTCMinutes()
              };
            }
            
            // String date (e.g. "04-06-2026 22:00")
            if (typeof val === 'string') {
              const [datePart, timePart] = val.split(' ');
              const parts = datePart.split(/[-/]/);
              if (parts.length >= 3) {
                 const d = parseInt(parts[0], 10);
                 const m = parseInt(parts[1], 10) - 1;
                 let y = parseInt(parts[2], 10);
                 if (y < 100) y += 2000;
                 
                 let h = 0;
                 let min = 0;
                 if (timePart) {
                   const timeParts = timePart.split(':');
                   if (timeParts.length >= 2) {
                     h = parseInt(timeParts[0], 10);
                     min = parseInt(timeParts[1], 10);
                   }
                 }
                 return {
                    dateObj: new Date(y, m, d, h, min),
                    year: y, month: m, day: d, hour: h, min: min
                 };
              }
            }
            return null;
          };

          // Determinar la fecha de la hoja seleccionada (que representa el Día según el usuario)
          let sheetDateObj = null;
          const chosenSheetName = targetSheets[0];
          if (chosenSheetName) {
             const match = chosenSheetName.match(dateSheetRegex);
             if (match) {
                const d = parseInt(match[1], 10);
                const m = parseInt(match[2], 10) - 1;
                let y = new Date().getFullYear(); // Si no hay año en la hoja, usamos el actual
                if (match[3]) {
                  y = parseInt(match[3], 10);
                  if (y < 100) y += 2000;
                }
                sheetDateObj = new Date(y, m, d);
             }
          }

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

            const parsedDateInfo = parseDateValue(fechaRaw);
            if (!parsedDateInfo) continue;

            const cod = codRaw.toString().trim();
            const ppu = ppuRaw.toString().trim();
            const taller = tallerRaw?.toString().trim() || '';
            const detalle = detalleRaw?.toString().trim() || '';
            
            const { hour, year, month, day, dateObj } = parsedDateInfo;
            let tipoTurno = 'Desconocido';
            
            // Regla principal estricta dada por el usuario:
            // La fecha del archivo (nombre de la hoja) SIEMPRE es la fecha de la "Mantención día".
            // El día de inicio (día anterior) es "Mantención noche".
            if (sheetDateObj) {
               const isSameDayAsSheet = (year === sheetDateObj.getFullYear() && month === sheetDateObj.getMonth() && day === sheetDateObj.getDate());
               
               const dayBefore = new Date(sheetDateObj);
               dayBefore.setDate(dayBefore.getDate() - 1);
               const isDayBeforeSheet = (year === dayBefore.getFullYear() && month === dayBefore.getMonth() && day === dayBefore.getDate());
               
               if (isSameDayAsSheet) {
                 tipoTurno = 'Mantención día';
               } else if (isDayBeforeSheet) {
                 tipoTurno = 'Mantención noche';
               } else {
                 // Si por algún motivo hay una fecha externa, nos fiamos de la hora
                 if (hour >= 18 || (hour > 0 && hour <= 4)) tipoTurno = 'Mantención noche';
                 else if (hour >= 5 && hour <= 17) tipoTurno = 'Mantención día';
                 else tipoTurno = 'Mantención noche'; // Default
               }
            } else {
               // Fallback si la hoja no tenía formato de fecha
               if (hour >= 18 || (hour > 0 && hour <= 4)) tipoTurno = 'Mantención noche';
               else if (hour >= 5 && hour <= 17) tipoTurno = 'Mantención día';
               else tipoTurno = 'Mantención noche';
            }

            let terminal = '';
            if (taller?.toUpperCase().includes('EL ROBLE')) terminal = 'El Roble';
            else if (taller?.toUpperCase().includes('LA REINA')) terminal = 'La Reina';

            const categories = detectCategories(detalle);

            newSchedule.push({
              cod,
              ppu,
              terminal,
              detalle,
              turno: tipoTurno,
              fechaProgramada: dateObj.toISOString(),
              horaLlegada: '',
              numeroOT: '',
              categories,
              estado: 'Pendiente',
            });
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
    clearSchedule,
    updateEntry,
    CATEGORY_PATTERNS,
  };
}
