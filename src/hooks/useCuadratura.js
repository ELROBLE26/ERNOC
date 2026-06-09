import { useState, useCallback, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useCuadratura() {
  const [quadratures, setQuadratures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch histrico de cuadraturas
  const fetchQuadratures = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('shift_quadratures')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setQuadratures(data || []);
    } catch (err) {
      setError(err.message || 'No fue posible cargar el historial de cuadraturas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuadratures();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel(`quadratures_sync_${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_quadratures' }, () => {
        fetchQuadratures();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchQuadratures]);

  // Sube una foto a Supabase Storage y retorna la URL pública
  const uploadPhoto = async (file, tankName) => {
    if (!isSupabaseConfigured) throw new Error('Supabase no está configurado');
    
    // Generar un nombre nico para evitar colisiones
    const fileExt = file.name.split('.').pop();
    const fileName = `${tankName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('mediciones_tanques')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    // Obtener la URL pblica
    const { data } = supabase.storage
      .from('mediciones_tanques')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // Guarda el reporte de cierre de turno completo
  const saveShiftQuadrature = async (surtidoresData, photosMap) => {
    if (!isSupabaseConfigured) throw new Error('Supabase no está configurado');
    setLoading(true);

    try {
      // 1. Subir todas las fotos al Storage y obtener sus URLs
      const uploadedPhotos = [];
      for (const [tankName, file] of Object.entries(photosMap)) {
        if (file) {
          const url = await uploadPhoto(file, tankName);
          uploadedPhotos.push({ tank: tankName, url });
        }
      }

      // 2. Guardar el reporte en la base de datos
      const payload = {
        surtidores_data: surtidoresData, // Arreglo con la cuadratura matemática
        photos: uploadedPhotos,          // URLs de las fotos
      };

      const { error: insertErr } = await supabase
        .from('shift_quadratures')
        .insert(payload);

      if (insertErr) throw insertErr;

      return { ok: true };
    } catch (err) {
      console.error('Error al guardar cuadratura:', err);
      return { ok: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    quadratures,
    loading,
    error,
    saveShiftQuadrature,
  };
}
