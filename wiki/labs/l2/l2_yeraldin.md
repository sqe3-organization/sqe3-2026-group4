# Lab 2 — Yeraldin: Postman Project Issues

[← Volver al índice grupal](l2.md)  
[← Volver al diseño de casos en Lab 1](../l1/l1_yeraldin.md)

Este documento presenta la implementación individual de Yeraldin Vasquez para el **Laboratorio 2: Pruebas de API con Postman**, aplicada sobre el módulo **Project Issues** de la API REST v4 de GitLab (`/api/v4/projects/:id/issues`).

---

## Contenido

- [Actividad #1: Configuración de Postman y Autorización](#actividad-1)
- [Actividad #2: Conceptos de Verificaciones y Pruebas Implementadas](#actividad-2)
- [Actividad #3: Factibilidad, Precondiciones, Ámbitos y Variables Compartidas](#actividad-3)
- [Actividad #4: Convenciones de Organización y Ejecución Automática](#actividad-4)
- [Actividad #5: Evaluación de Pares y Retroalimentación](#actividad-5)
- [Entregables de Postman](#entregables)

---

<a id="actividad-1"></a>

## Actividad #1: Configuración de Postman y Autorización

### 1.1 Configuración de la herramienta

Para este laboratorio se utilizó **Postman** (versión de escritorio y CLI Newman v6.2) configurado para interactuar con la API REST v4 de GitLab (`https://gitlab.com/api/v4`).

Pasos de configuración inicial:
1. Creación del espacio de trabajo local para SQE3.
2. Definición del ambiente de variables `yeraldin-project-issues.postman_environment.json`.
3. Ajuste de encabezados globales predeterminados (`User-Agent`, `Accept: application/json`).
4. Configuración del proxy y verificación de conectividad SSL/TLS hacia `gitlab.com`.

### 1.2 Peticiones simples exploratorias

Antes de abordar el flujo de incidencias, se realizaron peticiones simples para comprobar el estado y contrato general del servicio:

- **Consulta de versión:** `GET https://gitlab.com/api/v4/version`. Permite validar conectividad, latencia y disponibilidad sin requerir autenticación privilegiada (devuelve versión y revisión del servidor GitLab).
- **Consulta de proyectos accesibles:** `GET https://gitlab.com/api/v4/projects?per_page=1`. Permite verificar la respuesta en formato JSON array y la presencia de cabeceras de paginación (`x-total`, `x-per-page`).

### 1.3 Petición de autorización sobre GitLab API

GitLab REST API v4 soporta dos mecanismos principales de autorización mediante tokens:
1. **Encabezado `PRIVATE-TOKEN`:** Recibe directamente el token de acceso personal (PAT).
2. **Encabezado `Authorization: Bearer <token>`:** Estándar OAuth2 utilizado por tokens de sesión o tokens de pipeline.

En nuestra colección se adoptó la cabecera `PRIVATE-TOKEN: {{token_reporter}}` (o `{{token_owner}}` según la operación) vinculada a variables de ambiente.

**Matriz de roles y permisos configurados:**

| Rol | Token asignado | Permisos evaluados | Caso de prueba asociado |
| --- | --- | --- | --- |
| **Reporter** | `token_reporter` | Crear issues, leer detalles, actualizar descripción y cerrar incidencias. | `TC_ISSUE_POST_001`, `TC_ISSUE_PUT_001`, `TC_ISSUE_PUT_002` |
| **Project Owner** | `token_owner` | Eliminación física definitiva de incidencias (`DELETE /issues/:iid`). | `TC_ISSUE_DELETE_001`, `TC_ISSUE_E2E_001` |
| **Guest** | `token_guest` | Rol de solo lectura sin permisos de mutación en proyectos privados. | `TC_ISSUE_E2E_002` (espera 403 Forbidden o 404) |
| **Sin token / Inválido** | `invalid_token_...` | Rechazo inmediato de acceso. | `TC_ISSUE_POST_003` (espera 401 Unauthorized) |

---

<a id="actividad-2"></a>

## Actividad #2: Conceptos de Verificaciones y Pruebas Implementadas

### 2.1 Concepto de verificaciones en Postman

Las pruebas en Postman se ejecutan en la pestaña **Tests** tras recibir la respuesta HTTP. Utilizan la librería de aserciones Chai BDD encapsulada en la API `pm.*`:
- `pm.test(testName, function)`: Define el bloque de prueba reportable.
- `pm.response.code`: Accede al código de estado HTTP numérico.
- `pm.response.json()`: Parsea el cuerpo en formato JSON para verificar propiedades y tipos.
- `pm.response.headers`: Permite inspeccionar cabeceras HTTP como `Content-Type`, `x-per-page`, etc.
- `pm.response.responseTime`: Mide el tiempo de respuesta en milisegundos.

### 2.2 Cobertura de pruebas implementadas desde Lab 1

Se implementaron en la colección la totalidad de los casos diseñados en el Laboratorio 1 (`wiki/labs/l1/l1_yeraldin.md`), incorporando múltiples verificaciones por petición:

| Caso de prueba | Método y Endpoint | Verificaciones implementadas |
| --- | --- | --- |
| `TC_ISSUE_POST_001` | `POST /projects/:id/issues` | Código `201 Created`; cuerpo con propiedad `iid`, `id`, `state == "opened"`; título coincide con variable dinámica; descripción correcta; cabecera `Content-Type: application/json`. Guarda `issue_iid` en variables. |
| `TC_ISSUE_POST_002` | `POST /projects/:id/issues` | Código `400 Bad Request`; cuerpo JSON reporta error indicando que `title is missing`. |
| `TC_ISSUE_POST_003` | `POST /projects/:id/issues` | Código `401 Unauthorized` ante token falso; cuerpo confirma mensaje de autorización denegada. |
| `TC_ISSUE_POST_004` | `POST /projects/:id/issues` | Código `201 Created`; valida que el campo `labels` sea un arreglo y contenga `["bug", "sqe3"]`. Guarda `labels_issue_iid`. |
| `TC_ISSUE_GET_001` | `GET /projects/:id/issues/:issue_iid` | Código `200 OK`; coincide `iid`; estado válido (`opened`); contiene objeto `author` y fecha `created_at`; tiempo de respuesta < 2500 ms. |
| `TC_ISSUE_GET_002` | `GET /projects/:id/issues/999999999` | Código `404 Not Found`; mensaje de error indica recurso no encontrado. |
| `TC_ISSUE_PUT_001` | `PUT /projects/:id/issues/:issue_iid` | Código `200 OK`; descripción actualizada correctamente; título original no sufre modificaciones indeseadas. |
| `TC_ISSUE_PUT_002` | `PUT /projects/:id/issues/:issue_iid` | Código `200 OK`; `state == "closed"`; propiedad `closed_at` no nula. |
| `TC_ISSUE_PUT_003` | `PUT /projects/:id/issues/999999999` | Código `404 Not Found` al intentar actualizar un issue inexistente. |
| `TC_ISSUE_GET_003` | `GET /projects/:id/issues?state=closed` | Código `200 OK`; respuesta es un arreglo; comprobación iterativa de que cada elemento tiene `state == "closed"`; valida presencia del issue cerrado previamente. |
| `TC_ISSUE_GET_004` | `GET /projects/:id/issues?per_page=1&page=1` | Código `200 OK`; longitud del arreglo <= 1; cabeceras `x-per-page == "1"`, `x-page` y `x-total` presentes. |
| `TC_ISSUE_DELETE_001` | `DELETE /projects/:id/issues/:issue_iid` | Código `204 No Content` (o `200 OK`) usando token de Owner. |
| `TC_ISSUE_DELETE_002` | `DELETE /projects/:id/issues/999999999` | Código `404 Not Found` al intentar eliminar issue inexistente. |
| `TC_ISSUE_E2E_002` | `PUT /projects/:id/issues/:labels_issue_iid` | Código `403 Forbidden` (o `404 Not Found`) cuando un usuario con rol Guest intenta mutar el recurso. |
| `TC_ISSUE_E2E_001` | Flujo secuencial (6 pasos) | Verificación completa del ciclo de vida en subcarpeta dedicada: creación -> consulta -> cierre -> filtrado -> eliminación -> verificación de ausencia (404). |
| `Cleanup` | `DELETE /projects/:id/issues/:labels_issue_iid` | Eliminación segura de recursos auxiliares al finalizar las pruebas. |

---

<a id="actividad-3"></a>

## Actividad #3: Factibilidad, Precondiciones, Ámbitos y Variables Compartidas

### 3.1 Factibilidad de implementación en Postman

Todas las pruebas escritas en el Laboratorio 1 resultaron 100% factibles de implementar en Postman. No se requirió emular comportamientos externos complejos, ya que la API REST de GitLab es determinista y provee parámetros de consulta directos para filtrado (`state=closed`), paginación (`per_page=1`) y transición de estados (`state_event: "close"`).

### 3.2 Precondiciones y postcondiciones identificadas

| Operación | Precondiciones requeridas | Postcondiciones esperadas |
| --- | --- | --- |
| **POST (Creación)** | Proyecto accesible (`project_id`), token con rol Reporter o superior, `title` presente. | Nuevo issue registrado con número `iid` incremental, estado `opened`, datos almacenados en variables de colección. |
| **GET (Consulta por IID)** | `issue_iid` válido y activo en el proyecto. | Respuesta inmutable que no altera el estado del issue ni de la base de datos. |
| **PUT (Actualización / Cierre)** | `issue_iid` existente, permisos de Reporter, cuerpo JSON con campos válidos o `state_event`. | Issue modificado en base de datos; si se cierra, `closed_at` toma marca de tiempo actual. |
| **GET (Filtrado y límites)** | Al menos un issue en estado cerrado en el repositorio para validar búsqueda. | Lista filtrada devuelta sin efectos colaterales en los recursos. |
| **DELETE (Eliminación)** | `issue_iid` existente, **token con rol Project Owner o Administrador**. | Recurso purgado de la base de datos; consultas posteriores sobre ese `iid` devuelven 404. |

### 3.3 Jerarquía de ámbitos de variables en Postman

Postman organiza las variables en una jerarquía de alcance estricta, evaluada de mayor a menor prioridad en tiempo de ejecución:

```
[Local / Script] → [Data / Iteration] → [Environment] → [Collection] → [Global]
   (Mayor prioridad)                                                (Menor prioridad)
```

1. **Global:** Valores disponibles en todo el espacio de trabajo. Se evitaron para no afectar otras colecciones del equipo.
2. **Environment:** Almacena valores específicos del entorno de ejecución (`base_url`, `project_id`, `token_reporter`, `token_owner`). Permite cambiar fácilmente entre servidores de prueba sin modificar las peticiones.
3. **Collection:** Ámbito ideal para compartir datos generados durante la prueba entre solicitudes (`run_id`, `issue_iid`, `issue_id`, `e2e_issue_iid`). Los valores persisten durante la corrida pero no contaminan el ambiente global.
4. **Data:** Variables inyectadas mediante archivos CSV/JSON en ejecuciones por lotes de Collection Runner o Newman.
5. **Local:** Variables definidas con `let` o `const` dentro de scripts `prerequest` o `test`, vivas solo durante la transacción de esa petición.

### 3.4 Encadenamiento de peticiones y variables compartidas

Para lograr pruebas desacopladas y autónomas, se implementó el encadenamiento dinámico:

1. **Pre-request de colección:**
   ```javascript
   let runId = pm.collectionVariables.get("run_id");
   if (!runId) {
       runId = String(Date.now());
       pm.collectionVariables.set("run_id", runId);
   }
   pm.collectionVariables.set("issue_title", `sqe3-issue-${runId}`);
   pm.collectionVariables.set("e2e_issue_title", `sqe3-e2e-issue-${runId}`);
   ```
2. **Extracción y persistencia en la creación (`TC_ISSUE_POST_001`):**
   ```javascript
   const jsonData = pm.response.json();
   pm.collectionVariables.set("issue_iid", String(jsonData.iid));
   pm.collectionVariables.set("issue_id", String(jsonData.id));
   ```
3. **Consumo en solicitudes posteriores:**
   - La URL de consulta pasa a ser `{{base_url}}/projects/{{project_id}}/issues/{{issue_iid}}`.
   - La solicitud de cierre `TC_ISSUE_PUT_002` y la de eliminación `TC_ISSUE_DELETE_001` utilizan el mismo `{{issue_iid}}` sin requerir codificación rígida (*hardcoding*).

---

<a id="actividad-4"></a>

## Actividad #4: Convenciones de Organización y Ejecución Automática

### 4.1 Convenciones de estructura y nomenclatura

- **Nombres de peticiones:** Se utilizó el prefijo del caso de prueba formal: `TC_ISSUE_[METHOD]_[NUM] - [Descripción funcional]` (ej. `TC_ISSUE_POST_001 - Create an issue with valid data`).
- **Encabezados consistentes:** Todas las peticiones de mutación configuran explícitamente `Content-Type: application/json`.
- **Desacoplamiento de E2E:** El flujo de ciclo de vida completo se agrupó en una subcarpeta dedicada (`TC_ISSUE_E2E_001 - Complete issue lifecycle`) que maneja sus propias variables (`e2e_issue_iid`) para no interferir con las pruebas atómicas unitarias.
- **Petición final de limpieza:** Se incluye una petición de cleanup que purga recursos auxiliares creados durante la ejecución.

### 4.2 Ejecución automática

La colección está preparada para ejecutarse automáticamente mediante dos métodos:

#### A. Postman Collection Runner (Interfaz Gráfica)
1. Seleccionar la colección `SQE3 Lab 2 - Group 4 - Yeraldin Vasquez - Project Issues`.
2. Elegir el ambiente configurado con las credenciales locales.
3. Marcar la opción de persistencia de variables durante la corrida.
4. Ejecutar: Postman corre secuencialmente todas las peticiones reportando el resumen de aprobados y fallidos.

#### B. Ejecución desatendida por línea de comandos (Newman CLI)
Newman permite ejecutar la colección en terminales locales o en pipelines de CI/CD (GitLab CI, GitHub Actions):

```bash
# Ejecución directa con reporter estándar de consola
npx newman run wiki/labs/l2/postman/yeraldin-lab2/yeraldin-project-issues.postman_collection.json \
  -e mi_ambiente_local.json \
  --reporters cli
```

**Comando de verificación sintáctica en seco (sin red):**
```bash
node -e "
const c = require("./wiki/labs/l2/postman/yeraldin-lab2/yeraldin-project-issues.postman_collection.json");
console.log("Coleccion valida:", c.info.name, "- Total peticiones:", c.item.length);
"
```

---

<a id="actividad-5"></a>

## Actividad #5: Evaluación de Pares y Retroalimentación

### 5.1 Revisión cruzada de la implementación de Alexis Frene (Project Labels)

Se analizó la colección `alexis-project-labels.postman_collection.json` y su documentación en `l2_alexis.md`:

| Criterio evaluado | Observación técnica | Valoración |
| --- | --- | --- |
| **Complejidad y cobertura** | 17 solicitudes que cubren creación, consulta por título codificado, filtros de labels archivados, renombrado y límites de prioridad. Buen balance entre casos positivos y negativos. | **Excelente (Alta cobertura)** |
| **Manejo de variables** | Genera `run_id` y realiza codificación URI (`encodeURIComponent`) de nombres de labels en el script de pre-solicitud, lo que evita errores con espacios o caracteres especiales en rutas. | **Sobresaliente** |
| **Aserciones** | Comprueba códigos de estado (200, 201, 400, 401, 404) y atributos clave (`name`, `color`). | **Bueno** |
| **Facilidad de uso** | El archivo de ambiente de ejemplo es claro y no contiene credenciales expuestas. Las instrucciones de ejecución son fáciles de seguir. | **Excelente** |

### 5.2 Retroalimentación constructiva para el equipo

1. **Aserciones de cabeceras:** Se recomienda a los compañeros incorporar validaciones de cabeceras clave como `pm.response.headers.get("Content-Type")` y cabeceras de paginación (`x-per-page`), ya que enriquecen las verificaciones exigidas en la Actividad #2.
2. **Tiempos de respuesta:** Incorporar comprobaciones de latencia (`pm.expect(pm.response.responseTime).to.be.below(...)`) en las peticiones GET para certificar que el rendimiento de la API se mantiene dentro de umbrales aceptables.
3. **Estandarización de formato de payload:** Mientras que Project Labels utiliza parámetros codificados en formulario (`urlencoded`) por particularidades de ese endpoint de GitLab, Project Issues utiliza `application/json` puro; es importante mantener esta distinción clara en el reporte grupal.

---

<a id="entregables"></a>

## Entregables de Postman

- [Colección Postman](postman/yeraldin-lab2/yeraldin-project-issues.postman_collection.json)
- [Ambiente de ejemplo sin credenciales](postman/yeraldin-lab2/yeraldin-project-issues.postman_environment.example.json)
- [Instrucciones de configuración y Newman](postman/yeraldin-lab2/README.md)
