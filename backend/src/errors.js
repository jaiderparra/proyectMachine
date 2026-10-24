// Errores de dominio con la forma { error: { code, message, details } } definida en sdd/project.md.
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const validationError = (details, message = 'Datos inválidos') =>
  new AppError(400, 'VALIDATION_ERROR', message, details);
const unauthenticated = (message = 'Autenticación requerida') =>
  new AppError(401, 'UNAUTHENTICATED', message);
const forbidden = (message = 'No tiene permiso para realizar esta operación') =>
  new AppError(403, 'FORBIDDEN', message);
const notFound = (message = 'Recurso no encontrado') => new AppError(404, 'NOT_FOUND', message);
const duplicate = (message) => new AppError(409, 'DUPLICATE', message);
const invalidState = (message) => new AppError(409, 'INVALID_STATE', message);
const scheduleConflict = (conflicts) =>
  new AppError(409, 'SCHEDULE_CONFLICT', 'El espacio ya está reservado en esa franja', { conflicts });
const businessRule = (message, details) => new AppError(422, 'BUSINESS_RULE', message, details);

module.exports = {
  AppError,
  validationError,
  unauthenticated,
  forbidden,
  notFound,
  duplicate,
  invalidState,
  scheduleConflict,
  businessRule,
};
