import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFleetRow, deleteFleetRow, fetchFleet, subscribeToFleetChanges, updateFleetRow } from '../lib/fleetApi';
import {
  CREATE_DEFAULTS,
  createDuplicateValue,
  nextNumero,
  normalizeText,
  validateDuplicates,
  validateRequiredFleetFields,
} from '../utils/fleet';
import { isSupabaseConfigured } from '../lib/supabase';

export function useFleetData() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rowStatuses, setRowStatuses] = useState({});
  const [pendingUpdates, setPendingUpdates] = useState({});
  const rowsRef = useRef(rows);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const setRowStatus = useCallback((rowId, status, message = '') => {
    setRowStatuses((current) => ({
      ...current,
      [rowId]: {
        status,
        message,
      },
    }));
  }, []);

  const loadFleet = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setRows([]);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await fetchFleet();
      setRows(data);
    } catch (loadError) {
      setError(loadError.message || 'No fue posible cargar la flota.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFleet();
  }, [loadFleet]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined;
    }

    const unsubscribe = subscribeToFleetChanges((payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;

      setRows((current) => {
        if (eventType === 'INSERT') {
          const exists = current.some((row) => row.id === newRow.id);
          return exists ? current : [...current, newRow].sort(sortRows);
        }

        if (eventType === 'UPDATE') {
          return current.map((row) => (row.id === newRow.id ? { ...row, ...newRow } : row)).sort(sortRows);
        }

        if (eventType === 'DELETE') {
          return current.filter((row) => row.id !== oldRow.id);
        }

        return current;
      });
    });

    return unsubscribe;
  }, []);

  const retryPendingUpdates = useCallback(async () => {
    const entries = Object.entries(pendingUpdates);

    for (const [rowId, patch] of entries) {
      try {
        setRowStatus(rowId, 'saving');
        const updatedRow = await updateFleetRow(rowId, patch);
        setRows((current) => current.map((row) => (row.id === rowId ? updatedRow : row)).sort(sortRows));
        setPendingUpdates((current) => {
          const next = { ...current };
          delete next[rowId];
          return next;
        });
        setRowStatus(rowId, 'saved');
      } catch (retryError) {
        setRowStatus(rowId, 'error', retryError.message || 'No fue posible reintentar el guardado.');
      }
    }
  }, [pendingUpdates, setRowStatus]);

  useEffect(() => {
    const handleOnline = () => {
      retryPendingUpdates();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [retryPendingUpdates]);

  const saveCell = useCallback(
    async (rowId, patch) => {
      const currentRow = rowsRef.current.find((row) => row.id === rowId);

      if (!currentRow) {
        return { ok: false, message: 'La fila ya no existe.' };
      }

      const nextRow = { ...currentRow, ...patch };
      const requiredError = validateRequiredFleetFields(nextRow);
      if (requiredError) {
        setRowStatus(rowId, 'error', requiredError);
        return { ok: false, message: requiredError };
      }

      const duplicateError = validateDuplicates(rowsRef.current, rowId, nextRow);
      if (duplicateError) {
        setRowStatus(rowId, 'error', duplicateError);
        return { ok: false, message: duplicateError };
      }

      setRows((current) => current.map((row) => (row.id === rowId ? nextRow : row)));
      setRowStatus(rowId, 'saving');

      try {
        const updatedRow = await updateFleetRow(rowId, patch);
        setRows((current) => current.map((row) => (row.id === rowId ? updatedRow : row)).sort(sortRows));
        setPendingUpdates((current) => {
          const next = { ...current };
          delete next[rowId];
          return next;
        });
        setRowStatus(rowId, 'saved');
        return { ok: true };
      } catch (saveError) {
        setPendingUpdates((current) => ({
          ...current,
          [rowId]: {
            ...(current[rowId] ?? {}),
            ...patch,
          },
        }));
        setRowStatus(rowId, 'error', saveError.message || 'No fue posible guardar.');
        return { ok: false, message: saveError.message || 'No fue posible guardar.' };
      }
    },
    [setRowStatus],
  );

  const addBus = useCallback(
    async (payload) => {
      const draft = {
        ...CREATE_DEFAULTS,
        ...payload,
      };

      const requiredError = validateRequiredFleetFields(draft);
      if (requiredError) {
        return { ok: false, message: requiredError };
      }

      const duplicateError = validateDuplicates(rowsRef.current, null, draft);
      if (duplicateError) {
        return { ok: false, message: duplicateError };
      }

      try {
        const createdRow = await createFleetRow({
          ...draft,
          numero: draft.numero ? Number(draft.numero) : nextNumero(rowsRef.current),
        });
        setRows((current) => [...current, createdRow].sort(sortRows));
        setRowStatus(createdRow.id, 'saved');
        return { ok: true };
      } catch (createError) {
        return { ok: false, message: createError.message || 'No fue posible crear el registro.' };
      }
    },
    [setRowStatus],
  );

  const duplicateBus = useCallback(
    async (rowId) => {
      const baseRow = rowsRef.current.find((row) => row.id === rowId);

      if (!baseRow) {
        return { ok: false, message: 'Selecciona una fila válida.' };
      }

      const draft = {
        ...baseRow,
        numero: nextNumero(rowsRef.current),
        cod: createDuplicateValue(baseRow.cod, rowsRef.current, 'cod'),
        ppu: createDuplicateValue(baseRow.ppu, rowsRef.current, 'ppu'),
        observaciones: normalizeText(baseRow.observaciones)
          ? `${normalizeText(baseRow.observaciones)} | Copia`
          : 'Copia generada desde otro bus',
      };

      delete draft.id;
      delete draft.created_at;
      delete draft.updated_at;

      return addBus(draft);
    },
    [addBus],
  );

  const removeBus = useCallback(
    async (rowId) => {
      try {
        await deleteFleetRow(rowId);
        setRows((current) => current.filter((row) => row.id !== rowId));
        setPendingUpdates((current) => {
          const next = { ...current };
          delete next[rowId];
          return next;
        });
        return { ok: true };
      } catch (deleteError) {
        return { ok: false, message: deleteError.message || 'No fue posible eliminar el registro.' };
      }
    },
    [],
  );

  const pendingCount = useMemo(() => Object.keys(pendingUpdates).length, [pendingUpdates]);

  return {
    rows,
    loading,
    error,
    pendingCount,
    rowStatuses,
    loadFleet,
    addBus,
    duplicateBus,
    removeBus,
    retryPendingUpdates,
    saveCell,
  };
}

function sortRows(left, right) {
  return (Number(left.numero) || 0) - (Number(right.numero) || 0) || String(left.cod || '').localeCompare(String(right.cod || ''), 'es');
}
