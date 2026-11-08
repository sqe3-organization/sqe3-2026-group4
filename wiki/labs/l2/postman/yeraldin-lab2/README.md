# Yeraldin Vasquez - Lab 2 Postman Project Issues

Esta carpeta contiene la implementación individual de Yeraldin Vasquez para la API de incidencias de proyectos (Project Issues) de GitLab REST API v4.

## Archivos

- `yeraldin-project-issues.postman_collection.json`: Colección completa en formato Postman v2.1.0 que implementa los casos de prueba `TC_ISSUE_*`, aserciones de código de estado, cabeceras, cuerpo JSON, validación de esquemas y el flujo completo de ciclo de vida E2E.
- `yeraldin-project-issues.postman_environment.example.json`: Plantilla de variables de ambiente sin valores sensibles ni tokens.

## Configuración del Ambiente en Postman

1. Abrir Postman e importar ambos archivos (`.postman_collection.json` y `.postman_environment.example.json`).
2. Duplicar el ambiente importado bajo un nombre local (por ejemplo `SQE3 - Yeraldin Local`).
3. Configurar los valores de las siguientes variables en el ambiente local:
   - `base_url`: URL base de la API (por defecto `https://gitlab.com/api/v4`).
   - `project_id`: ID numérico del proyecto de pruebas en GitLab.
   - `token_reporter`: Token de acceso personal con alcance `api` y rol Reporter (o superior) para crear, consultar, modificar y cerrar issues.
   - `token_owner`: Token de acceso personal con alcance `api` y rol Project Owner / Mantenedor para la eliminación definitiva de issues.
   - `token_guest`: Token opcional con rol Guest para validar restricciones de autorización.
4. **Seguridad:** No subir tokens reales ni valores confidenciales al repositorio de Git ni incluirlos en capturas públicas.

## Estructura y Orden de Ejecución

La colección cuenta con un script de pre-solicitud a nivel de colección que genera dinámicamente un `run_id` basado en marca de tiempo (`Date.now()`) y asigna títulos únicos (`issue_title`, `e2e_issue_title`) para evitar colisiones entre ejecuciones sucesivas.

Para una ejecución secuencial recomendada:

1. **Creación de Issues:**
   - `TC_ISSUE_POST_001`: Crea el issue principal y almacena automáticamente `issue_iid` en variables de colección.
   - `TC_ISSUE_POST_002`: Valida el rechazo (400 Bad Request) al omitir el campo obligatorio `title`.
   - `TC_ISSUE_POST_003`: Valida el rechazo de autenticación (401 Unauthorized) con un token inválido.
   - `TC_ISSUE_POST_004`: Crea un issue con etiquetas y almacena `labels_issue_iid`.
2. **Consultas y Filtros:**
   - `TC_ISSUE_GET_001`: Consulta el issue creado por su `issue_iid` y verifica atributos y tiempos de respuesta.
   - `TC_ISSUE_GET_002`: Valida respuesta 404 ante un ID inexistente.
3. **Modificaciones:**
   - `TC_ISSUE_PUT_001`: Actualiza la descripción manteniendo el título original intacto.
   - `TC_ISSUE_PUT_002`: Cierra el issue mediante `state_event: "close"` y verifica la marca temporal `closed_at`.
   - `TC_ISSUE_PUT_003`: Valida 404 al intentar modificar un issue inexistente.
4. **Filtros Avanzados y Límites:**
   - `TC_ISSUE_GET_003`: Filtra issues con `state=closed` y comprueba que todos los elementos cumplan la condición.
   - `TC_ISSUE_GET_004`: Verifica paginación límite con `per_page=1` y valida las cabeceras `x-per-page` y `x-total`.
5. **Eliminación y Autorización:**
   - `TC_ISSUE_DELETE_001`: Elimina el issue principal con credenciales de Owner (204 No Content).
   - `TC_ISSUE_DELETE_002`: Valida 404 al intentar eliminar un issue inexistente.
   - `TC_ISSUE_E2E_002`: Comprueba que un rol no autorizado (Guest) no pueda editar issues.
6. **Flujo E2E Completo:**
   - Carpeta `TC_ISSUE_E2E_001 - Complete issue lifecycle`: Ejecuta los 6 pasos del ciclo de vida (crear -> consultar -> cerrar -> filtrar -> eliminar -> verificar ausencia) de manera autónoma.
7. **Limpieza:**
   - Solicitud `Cleanup - Delete remaining labels issue if present` para asegurar que el proyecto quede limpio.

## Ejecución Automatizada por CLI (Newman)

Las pruebas pueden ejecutarse de manera desatendida mediante Newman en consola o en un pipeline de integración continua:

```bash
# Ejecución básica indicando colección y ambiente
npx newman run yeraldin-project-issues.postman_collection.json \
  -e mi_ambiente_local.json \
  --reporters cli
```

Para generar un reporte HTML o JSON de la ejecución:

```bash
npx newman run yeraldin-project-issues.postman_collection.json \
  -e mi_ambiente_local.json \
  --reporters cli,json \
  --reporter-json-export resultado_ejecucion.json
```
