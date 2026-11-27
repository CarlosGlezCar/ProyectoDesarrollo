# Stride & Co. — Tienda deportiva y panel administrativo SSR

**Proyecto Integrador · Entregable 3 · Desarrollo de Aplicaciones Web**  
Universidad Autónoma de Chihuahua — Facultad de Ingeniería  
Repositorio: [ProyectoDesarrollo](https://github.com/CarlosGlezCar/ProyectoDesarrollo) · Rama de entrega: [`staging`](https://github.com/CarlosGlezCar/ProyectoDesarrollo/tree/staging)

> **Estado al 26 de noviembre de 2026:** las 14 funcionalidades SSR se implementaron y se reportaron 567 pruebas unitarias y 93 pruebas E2E aprobadas localmente. ESLint terminó con código 0. La auditoría de archivos de evidencia reportó 14/14 funcionalidades con las capturas obligatorias y 14 capturas móviles. La integración de las ramas, la asignación de responsables y la verificación del despliegue del Entregable 3 siguen pendientes.

## 1. Descripción

Stride & Co. es una aplicación educativa para administrar una tienda de artículos deportivos. Integra una tienda pública, una bolsa de compra, checkout con pago simulado, consulta de pedidos, panel administrativo y API REST. Las páginas se generan en el servidor mediante Express y Pug, consultando datos persistidos en PostgreSQL y MongoDB.

### Equipo

| Integrante | Rol de trabajo documentado en el entregable anterior |
| --- | --- |
| José Fernando Martínez Pacheco | Product Owner |
| Elio Castillo Reyes | Scrum Master |
| Carlos González Carrera | Developer |
| Bruno Salazar Carrillo | Developer |

La responsabilidad de cada funcionalidad debe confirmarse con el equipo y corresponder al trabajo efectivamente realizado y registrado en GitHub Project.

## 2. Tecnologías y arquitectura

| Capa | Tecnología |
| --- | --- |
| Servidor | Node.js 22, Express 4 |
| Interfaz | Pug, Bootstrap 5, Bootstrap Icons, CSS |
| Autenticación | JWT, express-jwt, bcrypt, cookie-parser |
| Autorización | AccessControl y permisos persistidos en PostgreSQL |
| Persistencia relacional | Sequelize, PostgreSQL |
| Persistencia documental | Mongoose, MongoDB Atlas |
| Configuración e idiomas | config, i18n, español e inglés |
| Pruebas | Jest, Supertest, ESLint |
| Infraestructura | Docker, Render, Render PostgreSQL |

```text
Navegador (HTML SSR)              Cliente API (JSON)
        |                                  |
    routes/web/                       routes/ (API)
        |                                  |
    controllers/web/                 controllers/
        +----------------+-----------------+
                         |
                     services/
                   /           \
             Sequelize        Mongoose
             PostgreSQL       MongoDB Atlas
```

Los controladores web renderizan vistas o redirigen; los de la API responden JSON. Ambos reutilizan servicios de negocio, autenticación y autorización. Las vistas usan layouts, partials y mixins, y el navegador no es la fuente de verdad de precios, totales ni existencias.

PostgreSQL almacena usuarios, roles, permisos, productos, variantes, inventario, intentos de checkout, reservas y operaciones de cambio de estado. MongoDB almacena clientes y pedidos con artículos, totales, dirección e historial de estados.

### Estructura del proyecto

```text
ProyectoDesarrollo/
├── bin/                     # Arranque del servidor
├── config/                  # Configuración por entorno
├── controllers/             # Controladores API
│   └── web/                 # Controladores SSR
├── routes/                  # Rutas API
│   └── web/                 # Rutas SSR
├── middlewares/             # JWT, RBAC, errores y protección web
├── models/
│   ├── sql/                 # Modelos Sequelize
│   └── mongo/               # Modelos Mongoose
├── services/                # Acceso a datos y reglas de negocio
├── views/                   # Pug: tienda, panel, login, errores
├── public/                  # Estilos y recursos estáticos
├── locales/                 # es.json y en.json
├── scripts/                 # Seed, auditorías y recuperación
├── test/                    # Pruebas Jest y E2E
├── docs/ssr/                # Evidencias por funcionalidad
├── Dockerfile
└── package.json
```

## 3. Funcionalidades SSR

La tabla documenta las 14 funcionalidades implementadas. Los permisos se expresan como `recurso:acción:alcance`; el asterisco representa las operaciones aplicables, no una clave literal. Las rutas se resumen por pantalla y acción. Antes de entregar, completar los responsables reales (no atribuir trabajo sin confirmación).

| ID | Funcionalidad | Rutas principales | Permiso | Usuario demo | Responsable | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Inicio y cierre de sesión | `GET/POST /login`, `POST /logout` | Pública (logout cierra la sesión) | Cualquier cuenta | Carlos González Carrera | [F01](docs/ssr/F01-auth/) |
| F2 | Inicio y catálogo | `GET /`, `GET /products` | Pública | No requiere cuenta | José Fernando Martínez Pacheco | [F02](docs/ssr/F02-catalog/) |
| F3 | Detalle de producto | `GET /products/:id` | Pública | No requiere cuenta | José Fernando Martínez Pacheco | [F03](docs/ssr/F03-product-detail/) |
| F4 | Bolsa de compra | `GET /cart`, `POST /cart/items`, `POST /cart/items/:variantId`, `POST /cart/items/:variantId/delete` | Pública | No requiere cuenta | José Fernando Martínez Pacheco | [F04](docs/ssr/F04-cart/) |
| F5 | Checkout y confirmación | `GET/POST /checkout`, `GET /my/orders/:id/confirmation` | `orders:create:own`; confirmación con acceso al pedido propio | USER | José Fernando Martínez Pacheco | [F05](docs/ssr/F05-checkout/) |
| F6 | Mis pedidos | `GET /my/orders`, `GET /my/orders/:id` | `orders:read:own` | USER | José Fernando Martínez Pacheco | [F06](docs/ssr/F06-my-orders/) |
| F7 | Dashboard | `GET /admin` | `products:read:any` y `orders:read:any` | ADMIN / SALES | Elio Castillo Reyes | [F07](docs/ssr/F07-dashboard/) |
| F8 | Productos | `/admin/products`, `/admin/products/new`, `/admin/products/:id/edit`; POST de creación, edición, estado y eliminación | `products:*:any` según acción | ADMIN | Elio Castillo Reyes | [F08](docs/ssr/F08-products/) |
| F9 | Variantes | `/admin/variants` y formularios de creación, edición y eliminación | `variants:*:any` según acción | ADMIN | Elio Castillo Reyes | [F09](docs/ssr/F09-variants/) |
| F10 | Inventario | `GET /admin/inventory`, `POST /admin/inventory/:variantId` | `inventory:read:any`, `inventory:update:any` | ADMIN / SALES | Elio Castillo Reyes | [F10](docs/ssr/F10-inventory/) |
| F11 | Pedidos | `GET /admin/orders`, `GET /admin/orders/:id`, `POST /admin/orders/:id/status` | `orders:read:any`, `orders:update:any` | ADMIN / SALES | Bruno Salazar Carrillo | [F11](docs/ssr/F11-orders/) |
| F12 | Clientes | `GET /admin/customers`, `GET /admin/customers/:id` | `customers:read:any` | ADMIN / SALES | Bruno Salazar Carrillo | [F12](docs/ssr/F12-customers/) |
| F13 | Usuarios | `/admin/users` y formularios de alta, edición y estado | `users:read:any`, `users:create:any`, `users:update:any` | ADMIN | Carlos González Carrera | [F13](docs/ssr/F13-users/) |
| F14 | Roles y permisos | `GET /admin/roles`, `GET /admin/roles/:id/edit`, `POST /admin/roles/:id` | `roles:read:any`, `roles:update:any` | ADMIN | Carlos González Carrera | [F14](docs/ssr/F14-roles/) |

Cada carpeta contiene `comparacion.png`, `codigo-fuente.png` y `movil.png`. La comparación muestra prototipo e implementación; el código fuente permite verificar SSR y la captura móvil documenta responsividad.

## 4. Instalación local

### Requisitos

- Node.js 22, npm y Git.
- PostgreSQL accesible en el puerto configurado (habitualmente 5432).
- MongoDB local o una base de desarrollo en MongoDB Atlas.
- Docker opcional para las bases y el servicio.

Una vez integrada la versión de entrega:

```bash
git clone https://github.com/CarlosGlezCar/ProyectoDesarrollo.git
cd ProyectoDesarrollo
git switch staging
npm ci
```

En PowerShell, si todavía no existe el archivo privado de desarrollo:

```powershell
if (!(Test-Path config/local-development.json)) {
    Copy-Item config/local-development.example.json config/local-development.json
}
```

Configura los valores de conexión según tu instalación. Ejemplo ilustrativo (no contiene secretos válidos):

```json
{
  "jwt": {
    "secret": "REEMPLAZAR_CON_SECRETO_ALEATORIO"
  },
  "database": {
    "postgres": {
      "password": "CONTRASENA_LOCAL"
    },
    "mongo": {
      "uri": "mongodb://127.0.0.1:27017/stride_co"
    }
  }
}
```

Consulta `config/default.json` para el host, puerto, usuario y nombre de base. En el entorno de desarrollo probado, PostgreSQL se ejecutó en el contenedor `stride-postgres` con la base `stride_co` y MongoDB se conectó a Atlas. Utiliza datos de desarrollo aislados; no compartas las credenciales ni la URI privada.

Inicia ambas bases antes de ejecutar la aplicación:

```powershell
npm start
```

Para desarrollo con reinicio automático:

```powershell
npm run dev
```

Comprobaciones: [tienda local](http://localhost:3000/), [panel local](http://localhost:3000/admin), [health local](http://localhost:3000/health).

### Seed

En una base nueva de demostración, después de configurar las conexiones y preparar las tablas:

```powershell
npm run seed
```

El seed prepara roles, permisos, usuarios y datos de demostración. Antes de repetirlo en una base existente, revisar sus efectos y respaldar los datos. No ejecutar contra una base con pedidos reales sin revisión.

## 5. Configuración y secretos

| Archivo o variable | Finalidad |
| --- | --- |
| `config/default.json` | Configuración general pública |
| `config/test.json` | Configuración aislada de pruebas |
| `config/production.json` | Configuración pública de producción, si existe |
| `config/custom-environment-variables.json` | Mapeo de variables, incluido `PORT` |
| `config/local-development.example.json` | Plantilla sin secretos válidos |
| `config/local-development.json` | Configuración privada local; no versionar |
| `config/local-production.json` | Configuración privada de producción; no versionar |
| `NODE_ENV` | Selección del entorno |
| `PORT` | Puerto asignado al servidor |
| `E2E_BASE_URL` | URL de destino para pruebas E2E, cuando se configura |

No publicar `.env`, claves JWT, contraseñas de las bases, URI privadas, tokens ni cookies. Comprobar también archivos versionados y el historial de Git; si hubo exposición de secretos reales, rotarlos.

## 6. Sesión, autenticación y RBAC

El login valida el usuario activo y su contraseña mediante bcrypt. El servicio compartido genera un JWT. En SSR se guarda en la cookie `access_token` con `HttpOnly`, `SameSite=Lax`, ruta `/` y `Secure` en producción. La API utiliza `Authorization: Bearer <token>`. El middleware verifica el JWT y consulta al usuario activo en cada solicitud protegida. Al cerrar sesión se elimina la cookie y se redirige a la tienda. La redirección posterior al login admite destinos internos permitidos.

`authenticate` identifica al usuario y `authorize` consulta los permisos vigentes en PostgreSQL. Los botones y el menú se muestran mediante `can(...)`, pero las rutas también verifican el permiso en el servidor. El alcance `own` comprueba la propiedad del recurso, por ejemplo, `Order → Customer → userId`; `any` autoriza la operación sobre los recursos correspondientes.

### Matriz inicial del seed

| Recurso | ADMIN | SALES | USER |
| --- | --- | --- | --- |
| users, roles, permissions | CRUD any | — | — |
| products, variants | CRUD any | read any | read any |
| inventory | CRUD any | read/update any | read any |
| customers | CRUD any | read/update any | read own |
| orders | CRUD any | create/read/update any | create/read/update own |

Los permisos efectivos pueden cambiar mediante F14. Las reglas de negocio pueden rechazar operaciones aunque exista permiso (por ejemplo, eliminación de un producto con variantes o modificación directa de un pedido web por API).

### Protección de formularios y errores

Los formularios utilizan validación del servidor y el patrón Post/Redirect/Get: los datos inválidos deben responder 400 y mostrar errores; los válidos redirigen con un mensaje flash. Los errores web renderizan HTML y la API devuelve JSON. Se verifican cabeceras de origen de formularios mediante `web-post.js`; no se afirma que esta medida equivalga a protección completa mediante tokens CSRF. No se exponen contraseñas, hashes ni salts en las respuestas.

## 7. Reglas de negocio

- Los precios y totales se calculan en el servidor a partir de identificadores y cantidades; el pago de checkout es simulado.
- La disponibilidad de una variante es `stock - reserved`, con `0 ≤ reserved ≤ stock`.
- El checkout registra reservas individuales e intentos persistentes; los movimientos de inventario se ejecutan en transacciones SQL.
- Los cambios de estado agregan entradas a `statusHistory`. No se sobrescribe el historial anterior desde F11.
- Los pedidos web no se modifican ni eliminan directamente por las rutas tradicionales de la API; se administran desde F11.
- No se cambia el propietario de un cliente ni se elimina un cliente con pedidos asociados.

| Estado nuevo | Stock | Reservadas |
| --- | --- | --- |
| paid | Sin cambio | Sin cambio |
| shipped | Descontar cantidad | Descontar cantidad |
| cancelled | Sin cambio | Liberar cantidad |
| delivered | Sin cambio | Sin cambio |

Transiciones admitidas en F11: `pending → paid/cancelled`, `paid → shipped/cancelled`, `shipped → delivered`. Los estados `delivered` y `cancelled` son finales. Los movimientos persistentes permiten recuperar confirmaciones pendientes sin repetir el descuento SQL.

En desarrollo, las operaciones de estado pendientes pueden recuperarse mediante:

```powershell
node scripts/recover-order-status.js
```

Este comando puede escribir en las bases. Ejecutarlo solo sobre el entorno correcto y después de revisar las operaciones pendientes. No borrar intentos o reservas directamente para resolver inconsistencias.

### Limitaciones conocidas

La coordinación PostgreSQL/MongoDB no es una transacción distribuida atómica. La recuperación de cambios de estado es manual; los pedidos históricos sin reservas individuales válidas necesitan conciliación antes del envío o cancelación. La protección del último administrador a nivel global, los tokens CSRF completos y la atomicidad de la eliminación de clientes frente a un checkout concurrente quedan como mejoras. Las pruebas locales no sustituyen la verificación de estos escenarios ni del despliegue.

## 8. Internacionalización

Español (`es`) e inglés (`en`) utilizan `locales/es.json` y `locales/en.json`. En la API la prioridad es `?lang`, `Accept-Language`, idioma por defecto. En las vistas, la cookie `lang` conserva la selección entre solicitudes y se consulta después de `?lang` y antes del encabezado. Se normalizan variantes regionales; el idioma por defecto es español. Las páginas usan `html lang`, selector de idioma y formato de fechas y moneda MXN mediante `Intl`.

Ejemplos locales: `/products?lang=es`, `/products?lang=en`, `/admin?lang=en` (con sesión y permisos). Las traducciones dinámicas se comprueban por grupo; el script no demuestra por sí mismo que todos los textos visibles estén traducidos.

## 9. API REST

Formato de respuesta habitual: `{ "message": "mensaje traducido", "data": ... }`. Los endpoints protegidos requieren JWT y el permiso aplicable.

| Método | Ruta | Permiso |
| --- | --- | --- |
| GET | `/health` | Pública |
| POST | `/api/auth/login` | Pública |
| GET | `/api/auth/me` | JWT válido |
| GET / POST | `/api/users`, `/api/roles`, `/api/permissions`, `/api/products`, `/api/variants`, `/api/inventory` | `recurso:read:any` / `recurso:create:any` |
| GET / PUT / DELETE | `/api/{recurso}/:id` (los seis recursos anteriores) | `recurso:read:any` / `recurso:update:any` / `recurso:delete:any` |
| POST | `/api/customers` | `customers:create:any` |
| GET | `/api/customers`, `/api/customers/:id` | `customers:read:own` o `customers:read:any` |
| PUT / DELETE | `/api/customers/:id` | `customers:update:any` / `customers:delete:any` |
| POST | `/api/orders` | `orders:create:own` o `orders:create:any` |
| GET | `/api/orders` | `orders:read:any` |
| GET | `/api/orders/own` | `orders:read:own` |
| GET | `/api/orders/:id` | `orders:read:own` o `orders:read:any` |
| PUT / DELETE | `/api/orders/:id` | `orders:update:own` o `orders:update:any`; `orders:delete:own` o `orders:delete:any` |

Códigos HTTP: 200 consulta/actualización, 201 creación, 302 redirección SSR, 400 datos inválidos, 401 falta de autenticación API, 403 permiso insuficiente, 404 recurso inexistente, 409 conflicto y 500 error inesperado.

Ejemplo de login y consulta en PowerShell (cuenta ficticia del entorno local):

```powershell
$base = 'http://localhost:3000'
$body = @{ email = 'admin@strideco.test'; password = 'Admin123!' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType 'application/json' -Body $body
$headers = @{ Authorization = "Bearer $($login.data.token)" }
Invoke-RestMethod -Uri "$base/api/products?lang=es" -Headers $headers
```

No imprimir ni guardar el token en las evidencias.

## 10. API pública y despliegue en Render

La URL documentada en el entregable anterior fue `https://proyectodesarrollo-1.onrender.com`. Debe confirmarse que sigue siendo la URL del servicio y que corresponde al commit final de `staging`.

| Recurso | URL prevista (pendiente de verificar para Entregable 3) |
| --- | --- |
| Tienda | https://proyectodesarrollo-1.onrender.com/ |
| Panel | https://proyectodesarrollo-1.onrender.com/admin |
| Login | https://proyectodesarrollo-1.onrender.com/login |
| API | https://proyectodesarrollo-1.onrender.com/api/ |
| Health | https://proyectodesarrollo-1.onrender.com/health |

Infraestructura prevista: Render Web Service con Docker, Render PostgreSQL y MongoDB Atlas. La rama de despliegue es `staging`. Configurar `NODE_ENV=production`, el puerto asignado y los secretos en Render. Si se conserva el Dockerfile del entregable anterior, crear el Secret File `local-production.json` montado en `/etc/secrets/local-production.json`; el arranque crea el enlace a `config/local-production.json`. Ejemplo de estructura sin credenciales reales:

```json
{
  "jwt": { "secret": "SECRETO_PRIVADO" },
  "database": {
    "postgres": { "url": "URL_INTERNA_POSTGRES_PRIVADA", "ssl": false },
    "mongo": { "uri": "URI_ATLAS_PRIVADA" }
  }
}
```

El valor de SSL debe ajustarse al tipo de conexión configurada (la conexión externa puede requerir TLS). Verificar que las bases estén activas, que la sincronización incluya las nuevas tablas y que existan los datos de demostración. No ejecutar seeds destructivos ni publicar credenciales de infraestructura. Actualizar esta sección con el resultado de la revisión pública después del despliegue.

### Usuarios de demostración

Cuentas ficticias del seed documentadas en el entregable anterior. Confirmar su disponibilidad en la versión pública después de desplegar. No reutilizar estas contraseñas para cuentas reales.

| Rol | Correo | Contraseña de demostración | Pantallas recomendadas |
| --- | --- | --- | --- |
| ADMIN | `admin@strideco.test` | `Admin123!` | F1 y F7–F14 |
| SALES | `ventas@strideco.test` | `Ventas123!` | F1, F7, F10, F11, F12 |
| USER | `usuario@strideco.test` | `Usuario123!` | F1–F6 |

Las funciones de lectura pública F2–F4 no requieren cuenta. El entorno desplegado debe ser exclusivamente de demostración con datos ficticios; limitar su exposición y no utilizar estas cuentas para producción real.

## 11. Pruebas y evidencias

Resultados reportados en ejecución local del 26/11/2026:

| Comprobación | Resultado | Evidencia |
| --- | --- | --- |
| ESLint | Código de salida 0 | [lint.txt](docs/ssr/pruebas/lint.txt) |
| Jest (mocks y pruebas unitarias) | 567/567, 40/40 suites | [unitarias.txt](docs/ssr/pruebas/unitarias.txt) |
| E2E | 93/93, 13/13 suites | [e2e.txt](docs/ssr/pruebas/e2e.txt) |
| Total | 660/660, 53/53 suites | Registros anteriores |
| Servicios | 15/15 referencias detectadas; ninguna consulta directa detectada por el patrón de auditoría | [servicios.txt](docs/ssr/pruebas/servicios.txt) |
| Traducciones | 43 plantillas, 420 verificaciones, 13 referencias dinámicas, 6 grupos, 0 faltantes detectadas | [i18n.txt](docs/ssr/pruebas/i18n.txt) |
| Evidencias | 28/28 obligatorias, 14/14 móviles, según existencia y tamaño de los archivos | [evidencias.txt](docs/ssr/pruebas/evidencias.txt) |

```powershell
npm run lint
npm test
# Con servidor y bases de desarrollo aisladas:
npm run test:e2e
node scripts/audit-services.js
node scripts/audit-views.js
node scripts/audit-evidence.js
```

`test/e2e/web.e2e.test.js` cubre el flujo de sesión y páginas SSR. Las pruebas E2E pueden escribir y eliminar datos; no ejecutarlas contra una base pública compartida sin preparar un entorno aislado. Los resultados de esta tabla son locales, no resultados de Render. Los scripts de auditoría son comprobaciones de apoyo y no validan visualmente las capturas ni demuestran la ausencia de todos los defectos.

## 12. Cómo agregar una pantalla SSR

1. Crear o reutilizar un servicio en `services/` para consultar datos y validar reglas de negocio.
2. Crear un controlador en `controllers/web/` que valide entradas y use `res.render`, `res.redirect` o `next(err)`.
3. Registrar la ruta en `routes/web/` con `authenticate`, `authorize` y protección POST según corresponda.
4. Crear la plantilla Pug en `views/`, extendiendo el layout correspondiente y reutilizando mixins/partials.
5. Agregar las claves de traducción a ambos archivos de `locales/`, definir título, descripción y estados vacíos.
6. Probar permisos, errores HTTP, formularios, PRG, idiomas y datos SSR; verificar funcionamiento sin JavaScript y diseño móvil.
7. Agregar las pruebas y las evidencias en `docs/ssr/` y actualizar la tabla de funcionalidades.

## 13. Trabajo colaborativo y entrega

La integración final debe realizarse en `staging`. Conservar las ramas de funcionalidad en el repositorio remoto, documentar commits descriptivos con Conventional Commits (`feat`, `fix`, `test`, `docs`, `refactor`) y actualizar GitHub Project con los responsables y tareas reales. No fabricar contribuciones ni atribuir commits a integrantes que no los realizaron.

### Pendientes antes de entregar

- [x] Confirmar responsables reales de F1–F14 y completar la tabla.
- [ ] Revisar las capturas y registros para comprobar que no muestran secretos ni datos personales.
- [ ] Integrar las ramas con sus commits y actualizar GitHub Project.
- [ ] Desplegar la versión final desde `staging`, verificar las dos bases y el seed.
- [ ] Confirmar las URL públicas y probar tienda, panel, login, permisos, idiomas y checkout simulado.
- [ ] Actualizar el estado de despliegue de este README con resultados reales.

Entrega: URL del repositorio de GitHub, con `staging` actualizada.
