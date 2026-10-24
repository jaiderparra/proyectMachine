const { validationError } = require('../errors');
const { isValidDate, isValidTime } = require('./time');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valida `input` contra un esquema declarativo y devuelve solo los campos conocidos.
// Con { partial: true } los campos obligatorios pueden omitirse (actualizaciones PATCH).
function validate(input, schema, { partial = false } = {}) {
  const data = input && typeof input === 'object' ? input : {};
  const errors = {};
  const result = {};

  for (const [field, rule] of Object.entries(schema)) {
    let value = data[field];
    const missing = value === undefined || value === null || value === '';

    if (missing) {
      if (rule.required && !partial) errors[field] = 'Campo obligatorio';
      else if (!partial && rule.default !== undefined) result[field] = rule.default;
      else if (value === null && rule.nullable) result[field] = null;
      continue;
    }

    const error = checkRule(value, rule);
    if (error) {
      errors[field] = error;
      continue;
    }
    if (rule.type === 'string') value = value.trim();
    if (rule.lowercase) value = value.toLowerCase();
    result[field] = value;
  }

  if (Object.keys(errors).length > 0) throw validationError(errors);
  return result;
}

function checkRule(value, rule) {
  switch (rule.type) {
    case 'string': {
      if (typeof value !== 'string') return 'Debe ser texto';
      const len = value.trim().length;
      if (rule.min !== undefined && len < rule.min) return `Debe tener al menos ${rule.min} caracteres`;
      if (rule.max !== undefined && len > rule.max) return `Debe tener máximo ${rule.max} caracteres`;
      if (rule.email && !EMAIL_RE.test(value.trim())) return 'Correo electrónico inválido';
      if (rule.enum && !rule.enum.includes(value)) return `Debe ser uno de: ${rule.enum.join(', ')}`;
      return null;
    }
    case 'integer': {
      if (!Number.isInteger(value)) return 'Debe ser un número entero';
      if (rule.min !== undefined && value < rule.min) return `Debe ser mayor o igual a ${rule.min}`;
      if (rule.max !== undefined && value > rule.max) return `Debe ser menor o igual a ${rule.max}`;
      return null;
    }
    case 'boolean':
      return typeof value === 'boolean' ? null : 'Debe ser verdadero o falso';
    case 'date':
      return isValidDate(value) ? null : 'Fecha inválida, use el formato YYYY-MM-DD';
    case 'time':
      return isValidTime(value) ? null : 'Hora inválida, use el formato HH:MM';
    default:
      return null;
  }
}

// Convierte un parámetro de ruta o consulta a entero positivo, o lanza 400.
function parseId(value, field = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw validationError({ [field]: 'Identificador inválido' });
  return n;
}

module.exports = { validate, parseId };
