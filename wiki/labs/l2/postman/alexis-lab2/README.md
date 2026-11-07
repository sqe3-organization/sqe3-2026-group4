# Alexis Frene - Lab 2 Postman Project Labels

Esta carpeta contiene la implementación individual de Alexis para la API de
labels de proyectos de GitLab REST API v4.

## Archivos

- `alexis-project-labels.postman_collection.json`: colección con los casos
  `TC_LABEL_*` y el flujo E2E de creación, consulta, actualización, filtro y
  eliminación.
- `alexis-project-labels.postman_environment.example.json`: ambiente de
  ejemplo sin `project_id` ni tokens.

## Configuración

1. Importar la colección y el ambiente de ejemplo en Postman.
2. Duplicar el ambiente para uso local y seleccionar la copia.
3. Completar `project_id` con el ID numérico de un proyecto de pruebas.
4. Completar `token_label_manager` con un token que pueda administrar labels.
5. Completar `token_label_reader` con un token de solo lectura para el caso de
   autorización, si se dispone de uno.
6. No guardar tokens en el repositorio ni en capturas.

La colección genera nombres únicos usando `run_id` y codifica los nombres antes
de enviarlos como parámetros de ruta. Los datos creados se pueden limpiar con
la solicitud `Cleanup - Delete archived label` y con los casos de eliminación.

## Orden recomendado

Para probar el flujo completo, ejecutar en este orden:

1. `TC_LABEL_POST_001` para crear el label principal.
2. `TC_LABEL_POST_002` a `TC_LABEL_GET_004` para validar creación, consulta,
   búsqueda, paginación y filtros.
3. `TC_LABEL_PUT_001` a `TC_LABEL_PUT_005` para validar actualización y
   autorización.
4. `TC_LABEL_DELETE_001` y `TC_LABEL_DELETE_002`.
5. La carpeta `TC_LABEL_E2E_001`.
6. La solicitud de limpieza.

Cada solicitud también puede ejecutarse por separado si se cumplen sus
precondiciones y se dispone de los valores de las variables correspondientes.

## Estado de ejecución

La colección está preparada para ejecución, pero los resultados reales dependen
del proyecto GitLab y de los tokens del equipo. No se incluyen credenciales ni
se inventan capturas o resultados.
