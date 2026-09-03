import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * RegistroFields — primitivas de formulario compartidas por las 4 pantallas de
 * registro rediseñadas (Cosechar, Insumos, Labores). Garantizan que las cuatro
 * usen la MISMA jerarquía, tamaños táctiles y estilo theme-aware (clases
 * `registro-*` definidas en registro-shell.css).
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 */

/** Etiqueta + hint opcional sobre un campo. */
export function FieldLabel({ children, hint, Icon }) {
  return (
    <span className="registro-field__label">
      {Icon && <Icon size={17} aria-hidden="true" />}
      {children}
      {hint && <span className="registro-field__hint">· {hint}</span>}
    </span>
  );
}

/** Mensaje de error inline bajo un campo. */
export function FieldError({ children }) {
  if (!children) return null;
  return (
    <p className="registro-error" role="alert">
      <AlertCircle size={14} aria-hidden="true" /> {children}
    </p>
  );
}

/**
 * @param {Object} props
 * @param {import('react').ReactNode} props.label
 * @param {string} [props.hint]
 * @param {import('react').ComponentType<{size?: number}>} [props.Icon]
 * @param {string} [props.error]
 * @param {string} [props.name]
 * @param {string} [props.value]
 * @param {(e: any) => void} [props.onChange]
 * @param {() => void} [props.onBlur]
 * @param {boolean} [props.required]
 * @param {string} [props.placeholder]
 */
export function TextField({ label, hint, Icon, error, ...rest }) {
  return (
    <label className="registro-field">
      <FieldLabel hint={hint} Icon={Icon}>{label}</FieldLabel>
      <input
        className={`registro-input ${error ? 'registro-input--invalid' : ''}`}
        aria-invalid={!!error}
        {...rest}
      />
      <FieldError>{error}</FieldError>
    </label>
  );
}

/**
 * @param {Object} props
 * @param {import('react').ReactNode} props.label
 * @param {string} [props.hint]
 * @param {import('react').ComponentType<{size?: number}>} [props.Icon]
 * @param {string} [props.error]
 * @param {string} [props.name]
 * @param {string} [props.value]
 * @param {(e: any) => void} [props.onChange]
 * @param {() => void} [props.onBlur]
 * @param {boolean} [props.required]
 * @param {string|number} [props.step]
 * @param {string|number} [props.min]
 * @param {string} [props.placeholder]
 */
export function NumberField({ label, hint, Icon, error, ...rest }) {
  return (
    <label className="registro-field">
      <FieldLabel hint={hint} Icon={Icon}>{label}</FieldLabel>
      <input
        type="number"
        inputMode="decimal"
        className={`registro-input ${error ? 'registro-input--invalid' : ''}`}
        aria-invalid={!!error}
        {...rest}
      />
      <FieldError>{error}</FieldError>
    </label>
  );
}

/**
 * @param {Object} props
 * @param {import('react').ReactNode} props.label
 * @param {string} [props.hint]
 * @param {import('react').ComponentType<{size?: number}>} [props.Icon]
 * @param {string} [props.error]
 * @param {string} [props.name]
 * @param {string} [props.value]
 * @param {(e: any) => void} [props.onChange]
 * @param {() => void} [props.onBlur]
 * @param {boolean} [props.required]
 * @param {Array<{value: string, label: string}>} props.options
 * @param {string} [props.placeholder]
 */
export function SelectField({ label, hint, Icon, error, options, placeholder, ...rest }) {
  return (
    <label className="registro-field">
      <FieldLabel hint={hint} Icon={Icon}>{label}</FieldLabel>
      <select
        className={`registro-select ${error ? 'registro-select--invalid' : ''}`}
        aria-invalid={!!error}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <FieldError>{error}</FieldError>
    </label>
  );
}

/**
 * @param {Object} props
 * @param {import('react').ReactNode} props.label
 * @param {string} [props.hint]
 * @param {import('react').ComponentType<{size?: number}>} [props.Icon]
 * @param {string} [props.error]
 * @param {string} [props.name]
 * @param {string} [props.value]
 * @param {(e: any) => void} [props.onChange]
 * @param {() => void} [props.onBlur]
 * @param {boolean} [props.required]
 * @param {number} [props.rows]
 */
export function TextAreaField({ label, hint, Icon, error, ...rest }) {
  return (
    <label className="registro-field">
      <FieldLabel hint={hint} Icon={Icon}>{label}</FieldLabel>
      <textarea
        className={`registro-textarea ${error ? 'registro-input--invalid' : ''}`}
        aria-invalid={!!error}
        {...rest}
      />
      <FieldError>{error}</FieldError>
    </label>
  );
}
