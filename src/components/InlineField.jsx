import { useEffect, useState } from 'react';
import { formatSaveStatus, getStatusTone } from '../utils/fleet';

export function InlineField({
  value,
  onSave,
  type = 'text',
  options = [],
  multiline = false,
  className = '',
  placeholder = '',
  inputId,
}) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  const commit = async (nextValue) => {
    if (nextValue === (value ?? '')) return;
    const result = await onSave(nextValue);
    setError(result?.ok === false ? result.message : '');
  };

  if (type === 'select') {
    return (
      <div className={`inline-field ${className}`}>
        <select
          className={`input-reset tone-${getStatusTone(localValue)}`}
          value={localValue ?? ''}
          onChange={async (event) => {
            const nextValue = event.target.value;
            setLocalValue(nextValue);
            await commit(nextValue);
          }}
        >
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        {error ? <span className="cell-error">{error}</span> : null}
      </div>
    );
  }

  if (multiline) {
    return (
      <div className={`inline-field ${className}`}>
        <textarea
          className="input-reset compact-textarea"
          value={localValue}
          placeholder={placeholder}
          rows={2}
          onChange={(event) => setLocalValue(event.target.value)}
          onBlur={() => commit(localValue)}
        />
        {error ? <span className="cell-error">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className={`inline-field ${className}`}>
      <input
        id={inputId}
        className="input-reset"
        value={localValue}
        placeholder={placeholder}
        onChange={(event) => setLocalValue(event.target.value)}
        onBlur={() => commit(localValue)}
        onKeyDown={async (event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
      />
      {error ? <span className="cell-error">{error}</span> : null}
    </div>
  );
}

export function SaveIndicator({ state }) {
  const status = state?.status ?? 'idle';
  const message = state?.message ?? '';

  if (status === 'idle') return null;

  return (
    <div className={`save-indicator save-${status}`}>
      <span>{formatSaveStatus(status)}</span>
      {message ? <small>{message}</small> : null}
    </div>
  );
}
