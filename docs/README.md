# Estructura de Documentación

Esta carpeta contiene toda la documentación técnica del proyecto Neotesis.

## Documentos Principales

### En la raíz del proyecto:
- [`README.md`](../README.md) - **Documentación principal del proyecto** (LÉEME PRIMERO)
- [`CHANGELOG.md`](../CHANGELOG.md) - Historial de cambios y versiones
- [`IMPLEMENTATION_SUMMARY.md`](../IMPLEMENTATION_SUMMARY.md) - Resumen técnico de implementación
- [`README_SECURITY.md`](../README_SECURITY.md) - Guía de seguridad y mejores prácticas

### En docs/:
- [`README.md`](README.md) - Este archivo (guía de navegación de documentación)
- [`AUTH_API.md`](AUTH_API.md) - Documentación de la API de autenticación
- [`DEPLOYMENT.md`](DEPLOYMENT.md) - Guía de deployment en Railway
- [`SECURITY_TESTING.md`](SECURITY_TESTING.md) - Pruebas y testing de seguridad

### En docs/archive/:
- [`MIGRATION_NOTES.md`](archive/MIGRATION_NOTES.md) - Notas históricas de migración de Netlify a Railway
- [`TAILWIND_FIXES.md`](archive/TAILWIND_FIXES.md) - Correcciones de Tailwind (obsoleto - ya no se usa Tailwind)

## Organización

```
neotesis/
├── README.md                    # Documentación principal (LÉEME PRIMERO)
├── CHANGELOG.md                 # Historial de versiones
├── IMPLEMENTATION_SUMMARY.md    # Resumen técnico
├── README_SECURITY.md           # Guía de seguridad
│
└── docs/
    ├── README.md                # Esta guía de navegación
    ├── AUTH_API.md              # API de autenticación
    ├── DEPLOYMENT.md            # Guía de deployment
    ├── SECURITY_TESTING.md      # Testing de seguridad
    └── archive/                 # Documentos históricos
        ├── MIGRATION_NOTES.md   # Migración Netlify → Railway
        └── TAILWIND_FIXES.md    # Correcciones Tailwind (obsoleto)
```

## Guías Rápidas

### Para Desarrolladores
1. Lee [`README.md`](../README.md) para entender la arquitectura
2. Revisa [`IMPLEMENTATION_SUMMARY.md`](../IMPLEMENTATION_SUMMARY.md) para ver el estado actual
3. Consulta [`AUTH_API.md`](AUTH_API.md) para integrar autenticación
4. Revisa [`CHANGELOG.md`](../CHANGELOG.md) para ver cambios recientes

### Para Deployment
1. Sigue [`DEPLOYMENT.md`](DEPLOYMENT.md) para desplegar en Railway
2. Configura variables de entorno según [`README.md`](../README.md)
3. Verifica seguridad con [`SECURITY_TESTING.md`](SECURITY_TESTING.md)

### Para Seguridad
1. Lee [`README_SECURITY.md`](../README_SECURITY.md) para mejores prácticas
2. Ejecuta tests de [`SECURITY_TESTING.md`](SECURITY_TESTING.md)
3. Revisa implementaciones en [`IMPLEMENTATION_SUMMARY.md`](../IMPLEMENTATION_SUMMARY.md)

## Mantenimiento

- Actualiza [`CHANGELOG.md`](../CHANGELOG.md) con cada cambio significativo
- Mantén [`IMPLEMENTATION_SUMMARY.md`](../IMPLEMENTATION_SUMMARY.md) sincronizado con el código
- Documenta nuevas APIs en archivos separados en `docs/`
- Mueve documentos obsoletos a `docs/archive/`
