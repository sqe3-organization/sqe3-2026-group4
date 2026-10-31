# Laboratorio 1 — Matthew: Wiki de proyectos

[← Volver al laboratorio del grupo](l1.md)

Voy a probar cómo se crean, consultan, editan y eliminan las páginas de la wiki de un proyecto.

## Contenido

- [Actividad 2: Investigación y exploración de Wiki](#actividad-2)
- [Actividad 3: Caso de uso](#actividad-3)
- [Actividad 4: Criterios y casos LLTC](#actividad-4)
- [Actividad 5: Clasificación de las pruebas](#actividad-5)
- [Fuentes de la característica](#fuentes)

---

<a id="actividad-2"></a>

## Actividad #2: Investigación y pruebas exploratorias

### 2.1 Descripción de la característica

La wiki mantiene documentación en un repositorio Git separado del código del proyecto. Para crear, editar y eliminar páginas se requiere un rol Developer, Maintainer u Owner. Referencia: [Wiki de GitLab](https://docs.gitlab.com/user/project/wiki/).

Las pruebas siguen este recorrido:

| Paso | Método | Endpoint relativo a `/api/v4` | Propósito |
| --- | --- | --- | --- |
| 1 | POST | `/projects/:id/wikis` | Crear una página. |
| 2 | GET | `/projects/:id/wikis/:slug` | Recuperarla. |
| 3 | PUT | `/projects/:id/wikis/:slug` | Actualizarla. |
| 4 | GET | `/projects/:id/wikis?with_content=true` | Buscarla en la lista con contenido. |
| 5 | DELETE | `/projects/:id/wikis/:slug` | Eliminarla. |

La API requiere `title` y `content` al crear; para actualizar requiere al menos uno de ellos. El formato predeterminado es `markdown`. Usaré el `slug` que devuelva la API y lo codificaré al incluirlo en la URL. Referencia: [Project wikis API](https://docs.gitlab.com/api/wikis/).

### 2.2 Configuración de la característica

Parto de la [autenticación del grupo](l1.md#autenticacion). Para estos casos uso un proyecto privado con Wiki habilitada y las siguientes variables adicionales:

| Variable | Uso en las pruebas de Wiki |
| --- | --- |
| `token_editor` | Token con alcance `api` de un miembro Developer o superior. Se usa como `access_token` al crear, consultar, editar y eliminar páginas. |
| `token_reader` | Token de un miembro Reporter con acceso de lectura y sin escritura. Confirmar sus permisos antes del caso de autorización. |
| `wiki_slug` | Slug original devuelto por la API, para comparar las respuestas. |
| `wiki_slug_url` | El mismo slug, codificado una sola vez para incluirlo en la URL. |

Las demás variables están en el documento del grupo.

### 2.3 Pruebas exploratorias

**Exploración y capturas:** pendientes. Estos son los pasos que voy a seguir:

| Exploración pendiente | Acción y datos propuestos | Evidencia que se debe registrar |
| --- | --- | --- |
| Crear | Abrir Wiki, crear `sqe3-wiki-<run_id>` con contenido `Guía inicial`. | Captura de Network con método, URL, cuerpo y respuesta. |
| Consultar | Abrir la página y recuperar su `slug` mediante REST. | Comparación del título y contenido visibles con el JSON. |
| Editar | Cambiar el contenido a `Guía actualizada`, conservando el título. | Petición de edición y consulta posterior que confirme persistencia. |
| Listar | Consultar páginas con y sin `with_content=true`. | Presencia de la página y diferencia del campo `content`. |
| Eliminar | Borrar únicamente la página creada para la exploración. | Respuesta de eliminación y consulta posterior. |

Cuerpo de la solicitud de creación:

```json
{
  "title": "sqe3-wiki-<run_id>",
  "content": "Guía inicial",
  "format": "markdown"
}
```

Cuerpo de la solicitud de edición:

```json
{
  "content": "Guía actualizada"
}
```

En DevTools registraré la petición que use la interfaz y la compararé con el endpoint REST v4; pueden usar rutas o formatos distintos.

---

<a id="actividad-3"></a>

## Actividad #3: Caso de uso

### 3.1 Descripción del caso de uso

**Historia de usuario:** Como integrante de un proyecto, quiero crear, consultar, actualizar y eliminar páginas de su wiki para mantener las instrucciones del equipo al día.

**Caso de uso:** Mantener una guía de instalación del proyecto.

**Actor:** Miembro autenticado con permiso de escritura sobre la wiki.

**Precondiciones:** Proyecto de pruebas accesible, Wiki habilitada, token válido y título exclusivo de la ejecución.

| Paso | Interacción | Comprobación propuesta |
| --- | --- | --- |
| 1 | Crear la guía con instrucciones iniciales. | Guardar el `slug` de la nueva página. |
| 2 | Consultar la guía por ese `slug`. | Comparar título y contenido con los datos enviados. |
| 3 | Actualizar las instrucciones sin cambiar el título. | Consultar nuevamente y comprobar el contenido actualizado. |
| 4 | Listar las páginas del proyecto. | Encontrar la guía por su `slug`. |
| 5 | Eliminar la guía de prueba. | Comprobar que ya no se puede recuperar ni aparece en la lista. |

**Resultado esperado:** La guía conserva los cambios mientras existe y deja de estar disponible después de eliminarla.

**Flujos alternos:** Rechazo de credenciales inválidas, campos requeridos ausentes, modificación sin permisos y operaciones sobre una página inexistente. Los casos se detallan en la actividad 4.

---

<a id="actividad-4"></a>

## Actividad #4: Criterios de aceptación y casos de prueba

### 4.1 Criterios de aceptación

Estos son los resultados esperados, tomando como referencia la [guía de estados HTTP de GitLab](https://docs.gitlab.com/api/rest/troubleshooting/). Los códigos que la documentación no precisa quedan por confirmar durante la exploración.

#### Operación: Crear una página — `POST /projects/:id/wikis`

- **CA-WIKI-01 · Positivo:** Con credenciales y permisos adecuados, título exclusivo y contenido válido, crear la página devuelve `201` y permite recuperarla con los mismos datos.
- **CA-WIKI-02 · Negativo:** Omitir `title` o `content`, en solicitudes separadas, impide crear la página. Se espera `400` por atributo requerido ausente.
- **CA-WIKI-03 · Negativo:** Un token inválido impide crear, editar o eliminar páginas y devuelve `401`.
- **CA-WIKI-04 · Positivo:** Crear con el formato omitido utiliza Markdown.

#### Operación: Actualizar una página — `PUT /projects/:id/wikis/:slug`

- **CA-WIKI-05 · Positivo:** Enviar únicamente `content` actualiza la página con `200`; una lectura posterior confirma el cambio y conserva el título.
- **CA-WIKI-06 · Negativo:** Una actualización sin `title` ni `content` se rechaza y conserva el contenido anterior; el código específico debe confirmarse.
- **CA-WIKI-07 · Negativo:** Actualizar un `slug` inexistente en un proyecto accesible devuelve `404` y no crea una página.
- **CA-WIKI-08 · Autorización:** Un miembro que puede leer pero no escribir no puede editar ni eliminar la página. La página debe conservarse sin cambios. El código de rechazo queda por confirmar en la exploración.

#### Operación: Consultar páginas — `GET /projects/:id/wikis[/:slug]`

- **CA-WIKI-09 · Positivo:** Consultar una página existente devuelve `200` y sus datos; listar con `with_content=true` permite comprobar su contenido.
- **CA-WIKI-10 · Negativo:** Consultar un `slug` inexistente en un proyecto accesible devuelve `404`.
- **CA-WIKI-11 · Codificación:** Una página creada en una ruta anidada puede recuperarse codificando el `slug` completo, incluido `/` como `%2F`.
- **CA-WIKI-12 · Límite:** En un proyecto preparado sin páginas, listar devuelve `200` y una lista vacía.

#### Operación: Eliminar una página — `DELETE /projects/:id/wikis/:slug`

- **CA-WIKI-13 · Positivo:** Eliminar una página existente devuelve `204` sin cuerpo; una consulta posterior devuelve `404` y la página no aparece al listar.
- **CA-WIKI-14 · Negativo:** Eliminar un `slug` inexistente devuelve `404` sin afectar otras páginas.

#### Criterio E2E

- **CA-WIKI-15 · E2E:** Crear, consultar, actualizar, listar, eliminar y volver a consultar demuestra el ciclo completo con los mismos datos y proyecto. La prueba limpia sus recursos aunque falle una comprobación intermedia.

### 4.2 Prompt y procedimiento

**Prompt para generar la lista base de escenarios:**

> Estoy preparando pruebas de la Wiki de proyectos de GitLab. A partir de la documentación oficial de esta funcionalidad (https://docs.gitlab.com/api/wikis/), propón una lista base de escenarios de prueba para crear, consultar, actualizar y eliminar páginas. Agrúpalos en positivos, negativos, boundary y E2E. Para cada escenario escribe un título claro y una descripción breve de lo que se quiere comprobar. Considera campos requeridos, permisos, recursos inexistentes y límites documentados. Evita escenarios repetidos y no inventes restricciones ni comportamientos; si algo necesita confirmarse mediante exploración, indícalo. La lista servirá como punto de partida para que yo filtre, corrija y valide cuáles escenarios aplican.

**Procedimiento:**

1. Usar el prompt para obtener una primera lista de escenarios.
2. Filtrar los escenarios repetidos o que no correspondan a las operaciones elegidas.
3. Revisar los escenarios con la documentación y anotar las dudas para la exploración.
4. Desarrollar los casos seleccionados con sus datos, pasos y resultados esperados.

<a id="casos-lltc"></a>

### 4.3 Casos de prueba de bajo nivel (LLTC)

Los 19 casos están diseñados, pero aún no se han ejecutado. La preparación, los datos y la limpieza siguientes aplican a todos, salvo las condiciones particulares indicadas en cada caso. Las prioridades quedan pendientes de revisión con el equipo.

**Preparación común:** configurar las variables de 2.2 y la autenticación del grupo. Usar `PRIVATE-TOKEN: {{token_editor}}` y, para solicitudes con cuerpo, `Content-Type: application/json`, salvo que el caso indique otro token. Las rutas parten de `{{base_url}}`.

**Datos de prueba:** `title = sqe3-wiki-{{run_id}}`, `content = Guía inicial` y `format = markdown`. Usar un `run_id` nuevo en cada ejecución de cada caso y comprobar que el título esté disponible. Cuando se necesite una página existente, crearla con `POST /projects/{{project_id}}/wikis`, comprobar `201` y guardar el `slug` como `wiki_slug`. Cada vez que se cree una página, guardar también su versión codificada en `wiki_slug_url`; conservar `wiki_slug` sin cambios para compararlo con el JSON. Para un `slug` inexistente, usar `ausente-{{run_id}}` y comprobar primero que su consulta devuelve `404`.

**Limpieza común:** al terminar cada caso, eliminar sus páginas con el token de editor, aunque falle una comprobación. Si el caso ya las eliminó, comprobar su ausencia. En los negativos, borrar cualquier página que se haya creado por error, siempre que pueda atribuirse al caso.

**Consultas de listas:** revisar todas las páginas de resultados antes de concluir que falta un registro. Las comparaciones de slugs se hacen con los valores originales, sin codificar.

#### TC_WIKI_POST_001 — Crear una guía con datos válidos

**Criterio:** CA-WIKI-01<br>
**Tipo:** Funcional positivo<br>
**Prioridad:** P1

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/wikis` con `{"title":"sqe3-wiki-{{run_id}}","content":"Guía inicial","format":"markdown"}`. | HTTP `201`; guardar `slug`; título, contenido y formato coinciden con los enviados. |
| 2 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; mismos título, contenido y formato. |

#### TC_WIKI_POST_002 — Rechazar creación sin título

**Criterio:** CA-WIKI-02<br>
**Tipo:** Funcional negativo<br>
**Prioridad:** P1

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible. Usar un proyecto donde nadie más modifique la wiki durante el caso, para poder comparar las listas.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/wikis`; guardar los slugs existentes. | HTTP `200`; lista de referencia guardada. |
| 2 | POST `/projects/{{project_id}}/wikis` con `{"content":"Guía inicial","format":"markdown"}`. | HTTP `400`; respuesta de error. |
| 3 | GET `/projects/{{project_id}}/wikis` y comparar slugs. | HTTP `200`; no se añadió ninguna página. |

#### TC_WIKI_POST_003 — Rechazar creación sin contenido

**Criterio:** CA-WIKI-02<br>
**Tipo:** Funcional negativo<br>
**Prioridad:** P1

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/wikis` con `{"title":"sqe3-wiki-{{run_id}}","format":"markdown"}`. | HTTP `400`; respuesta de error. |
| 2 | GET `/projects/{{project_id}}/wikis`; buscar el título enviado. | HTTP `200`; no aparece una página con ese título. |

#### TC_WIKI_POST_004 — Rechazar creación con token inválido

**Criterio:** CA-WIKI-03<br>
**Tipo:** Autenticación negativa<br>
**Prioridad:** P1

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | Sustituir la cabecera por `PRIVATE-TOKEN: token-invalido-sqe3` y enviar POST `/projects/{{project_id}}/wikis` con `{"title":"sqe3-wiki-{{run_id}}","content":"Guía inicial","format":"markdown"}`. | HTTP `401`. |
| 2 | Restaurar el token de editor y enviar GET `/projects/{{project_id}}/wikis`. | HTTP `200`; el título de prueba no aparece. |

#### TC_WIKI_POST_005 — Crear sin formato explícito

**Criterio:** CA-WIKI-04<br>
**Tipo:** Funcional positivo<br>
**Prioridad:** P2

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/wikis` con `{"title":"sqe3-wiki-{{run_id}}","content":"Guía inicial"}`. | HTTP `201`; guardar `slug`; `format` es `markdown`. |
| 2 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; `content` es `Guía inicial` y `format` es `markdown`. |

#### TC_WIKI_PUT_001 — Actualizar solo el contenido de una guía

**Criterio:** CA-WIKI-05<br>
**Tipo:** Funcional positivo<br>
**Prioridad:** P1

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible. Crear la página con los datos de 4.3 y guardar `wiki_slug` y su versión codificada en `wiki_slug_url`.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | PUT `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` con `{"content":"Guía actualizada"}`. | HTTP `200`; el título se conserva. |
| 2 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; `content` es `Guía actualizada` y el título es el original. |

#### TC_WIKI_PUT_002 — Rechazar actualización sin campos modificables

**Criterio:** CA-WIKI-06<br>
**Tipo:** Funcional negativo<br>
**Prioridad:** P2

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible. Crear la página con los datos de 4.3 y guardar `wiki_slug` y su versión codificada en `wiki_slug_url`.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; guardar título y contenido originales. |
| 2 | PUT `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` con `{}`. | Respuesta de rechazo; código exacto pendiente de confirmar en exploración. |
| 3 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; título y contenido no cambiaron. |

#### TC_WIKI_PUT_003 — Rechazar actualización de página inexistente

**Criterio:** CA-WIKI-07<br>
**Tipo:** Funcional negativo<br>
**Prioridad:** P2

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible. Confirmar que `ausente-{{run_id}}` no existe.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | PUT `/projects/{{project_id}}/wikis/ausente-{{run_id}}` con `{"content":"Guía actualizada"}`. | HTTP `404`. |
| 2 | GET `/projects/{{project_id}}/wikis/ausente-{{run_id}}`. | HTTP `404`; no se creó una página. |

#### TC_WIKI_PUT_004 — Rechazar actualización con token inválido

**Criterio:** CA-WIKI-03<br>
**Tipo:** Autenticación negativa<br>
**Prioridad:** P1

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible. Crear la página con los datos de 4.3 y guardar `wiki_slug` y su versión codificada en `wiki_slug_url`.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | PUT `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` con `{"content":"Cambio no autorizado"}` y `PRIVATE-TOKEN: token-invalido-sqe3`. | HTTP `401`. |
| 2 | Restaurar el token de editor y enviar GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; título y contenido originales intactos. |

#### TC_WIKI_GET_001 — Consultar una guía recién creada

**Criterio:** CA-WIKI-09<br>
**Tipo:** Funcional positivo<br>
**Prioridad:** P1

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible. Crear la página con los datos de 4.3 y guardar `wiki_slug` y su versión codificada en `wiki_slug_url`.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; `title` coincide con el enviado. |
| 2 | Revisar `content`, `format` y `slug` del JSON. | Contenido `Guía inicial`, formato `markdown` y slug igual al guardado. |

#### TC_WIKI_GET_002 — Incluir contenido al listar páginas

**Criterio:** CA-WIKI-09<br>
**Tipo:** Funcional positivo<br>
**Prioridad:** P2

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible. Crear la página con los datos de 4.3 y guardar `wiki_slug` y su versión codificada en `wiki_slug_url`.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/wikis?with_content=true`. | HTTP `200`; cuerpo de tipo lista. |
| 2 | Localizar la entrada con `slug = wiki_slug`. | La entrada existe; `content` es `Guía inicial` y el título coincide. |

#### TC_WIKI_GET_003 — Rechazar consulta de página inexistente

**Criterio:** CA-WIKI-10<br>
**Tipo:** Funcional negativo<br>
**Prioridad:** P2

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible. Confirmar que `ausente-{{run_id}}` no existe.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/wikis/ausente-{{run_id}}`. | HTTP `404`; no se devuelve una página. |

#### TC_WIKI_GET_004 — Recuperar una guía dentro de una ruta anidada

**Criterio:** CA-WIKI-11<br>
**Tipo:** Funcional positivo / codificación<br>
**Prioridad:** P2

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/wikis` con `{"title":"manual-{{run_id}}/instalacion","content":"Guía inicial","format":"markdown"}`. | HTTP `201`; guardar el slug de la ruta anidada. |
| 2 | Codificar el slug completo, reemplazando `/` por `%2F`; enviar GET `/projects/{{project_id}}/wikis/<slug_codificado>`. | HTTP `200`; título y contenido corresponden a la página creada. |

#### TC_WIKI_GET_005 — Listar una wiki sin páginas

**Criterio:** CA-WIKI-12<br>
**Tipo:** Límite: cero elementos<br>
**Prioridad:** P2

**Precondiciones:** Usar un proyecto de pruebas sin páginas; configurar su ID en `project_id`. No vaciar un proyecto compartido para preparar este caso.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/wikis` sobre el proyecto vacío. | HTTP `200`; cuerpo exactamente `[]`. |

#### TC_WIKI_DELETE_001 — Eliminar una guía existente

**Criterio:** CA-WIKI-13<br>
**Tipo:** Funcional positivo<br>
**Prioridad:** P1

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible. Crear la página con los datos de 4.3 y guardar `wiki_slug` y su versión codificada en `wiki_slug_url`.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | DELETE `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `204`; cuerpo vacío. |
| 2 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `404`. |
| 3 | GET `/projects/{{project_id}}/wikis`; buscar el slug eliminado. | HTTP `200`; el slug no aparece. |

#### TC_WIKI_DELETE_002 — Rechazar eliminación de página inexistente

**Criterio:** CA-WIKI-14<br>
**Tipo:** Funcional negativo<br>
**Prioridad:** P2

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible. Crear la página con los datos de 4.3 y guardar `wiki_slug` y su versión codificada en `wiki_slug_url`. Esta será la página de control. Confirmar que `ausente-{{run_id}}` no existe.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | DELETE `/projects/{{project_id}}/wikis/ausente-{{run_id}}`. | HTTP `404`. |
| 2 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; la página de control mantiene título y contenido. |

#### TC_WIKI_DELETE_003 — Rechazar eliminación con token inválido

**Criterio:** CA-WIKI-03<br>
**Tipo:** Autenticación negativa<br>
**Prioridad:** P1

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible. Crear la página con los datos de 4.3 y guardar `wiki_slug` y su versión codificada en `wiki_slug_url`.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | DELETE `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` con `PRIVATE-TOKEN: token-invalido-sqe3`. | HTTP `401`. |
| 2 | Restaurar el token de editor y enviar GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; página y contenido intactos. |

#### TC_WIKI_E2E_001 — Mantener una guía durante su ciclo completo

**Criterio:** CA-WIKI-15<br>
**Tipo:** E2E positivo<br>
**Prioridad:** P0

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | POST `/projects/{{project_id}}/wikis` con `{"title":"sqe3-wiki-{{run_id}}","content":"Guía inicial","format":"markdown"}`. | HTTP `201`; guardar el slug. |
| 2 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; contenido `Guía inicial`. |
| 3 | PUT `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` con `{"content":"Guía actualizada"}`. | HTTP `200`. |
| 4 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `200`; contenido `Guía actualizada`. |
| 5 | GET `/projects/{{project_id}}/wikis?with_content=true`; localizar el slug. | HTTP `200`; página presente con contenido actualizado. |
| 6 | DELETE `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `204`; cuerpo vacío. |
| 7 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}`. | HTTP `404`. |
| 8 | GET `/projects/{{project_id}}/wikis`; buscar el slug. | HTTP `200`; página ausente. |

#### TC_WIKI_E2E_002 — Proteger una guía frente a un lector sin escritura

**Criterio:** CA-WIKI-08<br>
**Tipo:** E2E / autorización negativa<br>
**Prioridad:** P1

**Precondiciones:** Entorno de 2.2 configurado y título de prueba disponible. Crear la página con los datos de 4.3 y guardar `wiki_slug` y su versión codificada en `wiki_slug_url`. Configurar `token_reader` con acceso de lectura y sin escritura.

| Paso | Solicitud o acción | Resultado esperado |
| --- | --- | --- |
| 1 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` con `PRIVATE-TOKEN: {{token_reader}}`. | HTTP `200`; confirmar que el lector tiene acceso de lectura. |
| 2 | PUT `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` con token de lector y `{"content":"Cambio del lector"}`. | Escritura rechazada; código exacto pendiente de confirmar según permisos. |
| 3 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` con el token de editor. | HTTP `200`; contenido original intacto. |
| 4 | DELETE `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` con el token de lector. | Eliminación rechazada; código exacto pendiente de confirmar según permisos. |
| 5 | GET `/projects/{{project_id}}/wikis/{{wiki_slug_url}}` con el token de editor. | HTTP `200`; página y contenido originales intactos. |

---

<a id="actividad-5"></a>

## Actividad #5: Clasificación de las pruebas

### 5.1 Clasificación y priorización propuestas

| Tipo | Propósito | Ejemplo |
| --- | --- | --- |
| Funcional positivo | Comprobar una operación válida y su efecto. | TC_WIKI_PUT_001 |
| Funcional negativo | Comprobar rechazo y ausencia de cambios indebidos. | TC_WIKI_POST_002 |
| Autenticación / autorización negativa | Comprobar credenciales y restricciones de escritura. | TC_WIKI_DELETE_003 / TC_WIKI_E2E_002 |
| Límite | Comprobar una colección sin elementos. | TC_WIKI_GET_005 |
| E2E | Comprobar un flujo encadenado y su estado final. | TC_WIKI_E2E_001 |

Las [convenciones, prioridades y retroalimentación](l1.md#actividad-5) se reúnen en el documento del grupo.

---

<a id="fuentes"></a>

## Fuentes de la característica

- [Project wikis API](https://docs.gitlab.com/api/wikis/).
- [Wiki: funcionamiento y permisos](https://docs.gitlab.com/user/project/wiki/).
- [Fuentes compartidas del laboratorio](l1.md#fuentes).

[← Volver al laboratorio del grupo](l1.md)
