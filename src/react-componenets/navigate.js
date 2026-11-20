// Wrapped in an object so tests can replace it (window.location can't be spied on).
export const navigate = { to: (path) => window.location.assign(path) };
