import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export function useFuelData() {
  const [fuelRecords, setFuelRecords] = useState([]);
  const [lastUploadDate, setLastUploadDate] = useState(null);
  const [fileName, setFileName] = useState(null);

  const fetchRecords = async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase.from('fuel_records').select('*');
    if (!error && data) {
      const records = data.map((d) => d.raw_data);
      setFuelRecords(records);
      if (data.length > 0) {
        setLastUploadDate(data[0].created_at);
      } else {
        setLastUploadDate(null);
      }
    }
  };

  useEffect(() => {
    fetchRecords();

    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('fuel_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fuel_records' }, () => {
        fetchRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const saveRecords = async (records, name) => {
    if (!isSupabaseConfigured) {
      console.warn('Supabase no configurado');
      return;
    }
    
    setFuelRecords(records); // Optimistic UI
    if (name) setFileName(name);
    
    try {
      // Delete old records
      await supabase.from('fuel_records').delete().neq('ppu', 'impossible_delete_all');
      
      const payload = records.map((r) => ({
        ppu: r.ppu,
        interno: r.cod,
        litros: r.litros,
        surtidor: r.surtidor,
        fecha: r.fecha,
        hora: r.hora,
        raw_data: r,
      }));
      
      await supabase.from('fuel_records').insert(payload);
    } catch (error) {
      console.error('Error subiendo a Supabase:', error);
    }
  };

  const clearFuelData = async () => {
    setFuelRecords([]);
    setLastUploadDate(null);
    setFileName(null);
    if (isSupabaseConfigured) {
      await supabase.from('fuel_records').delete().neq('ppu', 'impossible_delete_all');
    }
  };

  /**
   * Flexible column matcher — finds the best key in a row object
   * that matches any of the given candidate names (case-insensitive, partial).
   */
  const findColumnKey = (rowKeys, candidates) => {
    // Try exact match first
    for (const candidate of candidates) {
      const exactMatch = rowKeys.find(
        (k) => k.toLowerCase().trim() === candidate.toLowerCase().trim()
      );
      if (exactMatch) return exactMatch;
    }
    // Then partial includes
    for (const candidate of candidates) {
      const partialMatch = rowKeys.find((k) =>
        k.toLowerCase().includes(candidate.toLowerCase())
      );
      if (partialMatch) return partialMatch;
    }
    return null;
  };

  /**
   * Parse an uploaded file (xlsx, xls, html, htm).
   * Supports the exact RBU Santiago / Carga combustible format from the screenshot.
   */
  const parseFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const allParsedRows = [];

          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonRaw = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              defval: '',
            });

            // Find the header row — look for keywords in the first 30 rows
            let headerRowIndex = -1;
            for (let i = 0; i < Math.min(30, jsonRaw.length); i++) {
              const row = jsonRaw[i];
              if (!row || !Array.isArray(row)) continue;
              const rowStr = row
                .map((c) => (c != null ? c.toString() : ''))
                .join('|')
                .toLowerCase();

              // Detect header by key columns
              const hasInterno =
                rowStr.includes('interno') || rowStr.includes('n°');
              const hasPatente =
                rowStr.includes('patente') || rowStr.includes('ppu');
              const hasLitros =
                rowStr.includes('litros') ||
                rowStr.includes('cantidad') ||
                rowStr.includes('volumen');
              const hasSurtidor =
                rowStr.includes('surtidor') ||
                rowStr.includes('dispensador') ||
                rowStr.includes('bomba');
              const hasTurno = rowStr.includes('turno');

              // Need at least 2 key columns to be a valid header
              const matches = [
                hasInterno,
                hasPatente,
                hasLitros,
                hasSurtidor,
                hasTurno,
              ].filter(Boolean).length;
              if (matches >= 2) {
                headerRowIndex = i;
                break;
              }
            }

            if (headerRowIndex === -1) continue;

            const sheetData = XLSX.utils.sheet_to_json(worksheet, {
              range: headerRowIndex,
              raw: true,
              defval: '',
            });

            allParsedRows.push(...sheetData);
          }

          if (allParsedRows.length === 0) {
            throw new Error(
              'No se encontraron las columnas esperadas (N° Interno, Patente, Cantidad litros, Surtidor) en ninguna hoja del archivo.'
            );
          }

          // Determine column keys from the first row's keys
          const sampleKeys = Object.keys(allParsedRows[0]);
          const colMap = {
            turno: findColumnKey(sampleKeys, ['Turno']),
            fecha: findColumnKey(sampleKeys, ['Fecha']),
            hora: findColumnKey(sampleKeys, ['Hora']),
            terminal: findColumnKey(sampleKeys, [
              'Terminal',
              'Taller',
              'Ubicación',
            ]),
            cod: findColumnKey(sampleKeys, [
              'Número Interno',
              'Numero Interno',
              'N° interno',
              'Nro interno',
              'interno',
            ]),
            ppu: findColumnKey(sampleKeys, ['Patente', 'PPU']),
            litros: findColumnKey(sampleKeys, [
              'Cantidad litros',
              'Cantidad Litros',
              'Litros',
              'Cantidad',
              'Volumen',
            ]),
            tipo: findColumnKey(sampleKeys, ['Tipo']),
            tapa: findColumnKey(sampleKeys, ['Tapa']),
            filtracion: findColumnKey(sampleKeys, ['Filtración', 'Filtracion']),
            modeloChasis: findColumnKey(sampleKeys, [
              'Modelo chasis',
              'Modelo',
              'Chasis',
            ]),
            estanque: findColumnKey(sampleKeys, ['Estanque']),
            licencia: findColumnKey(sampleKeys, ['Licencia']),
            gases: findColumnKey(sampleKeys, ['Gases']),
            odometro: findColumnKey(sampleKeys, [
              'Odómetro',
              'Odometro',
              'Kilometraje',
            ]),
            rutPlanillero: findColumnKey(sampleKeys, [
              'RUT planillero',
              'Rut planillero',
            ]),
            nombrePlanillero: findColumnKey(sampleKeys, [
              'Nombre Planillero',
              'Nombre planillero',
            ]),
            rutSupervisor: findColumnKey(sampleKeys, [
              'RUT supervisor',
              'Rut supervisor',
            ]),
            nombreSupervisor: findColumnKey(sampleKeys, [
              'Nombre supervi',
              'Nombre supervisor',
            ]),
            rutConductor: findColumnKey(sampleKeys, [
              'RUT conductor',
              'Rut conductor',
            ]),
            surtidor: findColumnKey(sampleKeys, [
              'Surtidor',
              'Dispensador',
              'Bomba',
            ]),
            captador: findColumnKey(sampleKeys, ['Captador']),
            cargadoPor: findColumnKey(sampleKeys, [
              'Cargado por',
              'Cargado Por',
            ]),
          };

          const records = [];
          let rowIndex = 0;

          for (const row of allParsedRows) {
            rowIndex++;
            const getVal = (key) => {
              if (!key) return '';
              const v = row[key];
              return v != null ? v.toString().trim() : '';
            };
            const getNum = (key) => {
              if (!key) return 0;
              const v = row[key];
              if (v == null) return 0;
              const n = parseFloat(v);
              return isNaN(n) ? 0 : n;
            };

            const cod = getVal(colMap.cod);
            const ppu = getVal(colMap.ppu).toUpperCase();
            const litros = getNum(colMap.litros);
            const surtidor = getVal(colMap.surtidor) || 'Sin Surtidor';

            // Skip rows with no identifying data
            if (!cod && !ppu) continue;

            records.push({
              _idx: rowIndex,
              turno: getVal(colMap.turno),
              fecha: getVal(colMap.fecha),
              hora: getVal(colMap.hora),
              terminal: getVal(colMap.terminal),
              cod,
              ppu,
              litros,
              tipo: getVal(colMap.tipo),
              tapa: getVal(colMap.tapa),
              filtracion: getVal(colMap.filtracion),
              modeloChasis: getVal(colMap.modeloChasis),
              estanque: getNum(colMap.estanque),
              odometro: getNum(colMap.odometro),
              surtidor,
              captador: getVal(colMap.captador),
              cargadoPor: getVal(colMap.cargadoPor),
            });
          }

          if (records.length === 0) {
            throw new Error(
              'El archivo fue procesado pero no se encontraron registros de carga válidos.'
            );
          }

          saveRecords(records, file.name);
          resolve(records);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('Error leyendo el archivo.'));
      reader.readAsArrayBuffer(file);
    });
  };

  return {
    fuelRecords,
    lastUploadDate,
    fileName,
    parseFile,
    clearFuelData,
  };
}
