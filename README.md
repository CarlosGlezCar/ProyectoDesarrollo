# Stride & Co. — Backend de tienda deportiva

**Proyecto Integrador — Entregable 2**  
**Desarrollo de Aplicaciones Web**  
**Universidad Autónoma de Chihuahua**

**Repositorio:** https://github.com/CarlosGlezCar/ProyectoDesarrollo  
**Rama de entrega:** `staging`  
**API pública:** https://proyectodesarrollo-1.onrender.com  
**Health Check:** https://proyectodesarrollo-1.onrender.com/health

---

## 1. Descripción del proyecto

Stride & Co. es una API REST desarrollada para administrar los procesos principales de una tienda deportiva, incluyendo usuarios, roles, permisos, productos, variantes, inventario, clientes y órdenes.

El proyecto utiliza Node.js y Express como plataforma de desarrollo, con autenticación JWT, control de acceso basado en roles (RBAC), internacionalización y persistencia mediante dos bases de datos.

Se utiliza PostgreSQL para la información relacional y MongoDB para la información documental. El backend está desplegado en Render mediante Docker y cuenta con pruebas automatizadas desarrolladas con Jest y Supertest.

### 1.1. Integrantes

| Integrante | Rol |
|---|---|
| José Fernando Martínez Pacheco | Product Owner |
| Elio Castillo Reyes | Scrum Master |
| Carlos González Carrera | Developer |
| Bruno Salazar Carrillo | Developer |

### 1.2. Tecnologías utilizadas

| Componente | Tecnología |
|---|---|
| Backend | Node.js 22, Express |
| Base de datos relacional | PostgreSQL |
| ORM | Sequelize |
| Base de datos documental | MongoDB Atlas |
| ODM | Mongoose |
| Autenticación | JWT, express-jwt, bcrypt |
| Autorización | AccessControl, RBAC |
| Internacionalización | i18n |
| Configuración | node-config |
| Motor de vistas | Pug |
| Pruebas | Jest, Supertest |
| Generación de pruebas E2E | Google Antigravity |
| Calidad de código | ESLint |
| Contenedores | Docker |
| Despliegue | Render |
| Control de versiones | Git, GitHub |

---

## 2. Arquitectura del sistema

El backend sigue una arquitectura basada en rutas, middlewares, controladores y modelos.

Las solicitudes HTTP pasan por Express, donde se aplica la configuración de idioma, la autenticación JWT y la autorización RBAC antes de ejecutar las operaciones correspondientes.

```text
Cliente HTTP
    |
    v
Express
    |
    v
Internacionalización (i18n)
    |
    v
Router
    |
    v
Autenticación JWT
    |
    v
Autorización RBAC
    |
    v
Controller
    |
    +-----------------------+
    |                       |
    v                       v
Sequelize                Mongoose
    |                       |
    v                       v
PostgreSQL               MongoDB
    |                       |
    +-----------+-----------+
                |
                v
          Respuesta JSON
          { message, data }
```

Las rutas públicas de inicio, salud e inicio de sesión no requieren autenticación.

### 2.1. Base de datos relacional

PostgreSQL almacena la información de:

- Usuarios.
- Roles.
- Permisos.
- Relaciones entre roles y permisos.
- Productos.
- Variantes.
- Inventario.

Los modelos se encuentran en `models/sql/` y utilizan Sequelize.

Entre las principales relaciones se encuentran:

```text
User → Role
Role ↔ Permission
Product → ProductVariant
ProductVariant → Inventory
```

### 2.2. Base de datos documental

MongoDB almacena:

- Clientes.
- Órdenes.
- Direcciones de envío.
- Productos incluidos en órdenes.
- Historial de estados.

Los modelos se encuentran en `models/mongo/` y utilizan Mongoose.

Los datos relacionales y documentales se vinculan mediante los identificadores correspondientes.

---

## 3. Instalación desde cero

### 3.1. Requisitos

Se necesita tener instalado:

- Node.js 22.
- npm.
- Git.
- PostgreSQL.
- MongoDB local o acceso a MongoDB Atlas.
- Docker, opcional para trabajar con contenedores.

### 3.2. Clonar el repositorio

```bash
git clone https://github.com/CarlosGlezCar/ProyectoDesarrollo.git
cd ProyectoDesarrollo
```

Seleccionar la rama del entregable:

```bash
git switch staging
```

### 3.3. Instalar dependencias

```bash
npm ci
```

Se utiliza `npm ci` para instalar las versiones de dependencias registradas en `package-lock.json`.

### 3.4. Configurar el entorno local

El proyecto utiliza `node-config` para cargar la configuración según el entorno.

Se debe crear un archivo de configuración local a partir de la plantilla incluida en el repositorio.

En Git Bash:

```bash
cp config/local-development.example.json config/local-development.json
```

En PowerShell:

```powershell
Copy-Item config/local-development.example.json config/local-development.json
```

Después, editar `config/local-development.json` para agregar las credenciales y conexiones correspondientes.

Ejemplo de estructura:

```json
{
  "jwt": {
    "secret": "REEMPLAZAR_POR_UNA_CLAVE_ALEATORIA_LARGA"
  },
  "database": {
    "postgres": {
      "password": "CONTRASENA_LOCAL_POSTGRESQL"
    },
    "mongo": {
      "uri": "mongodb://127.0.0.1:27017/stride_co"
    }
  }
}
```

Los valores anteriores son ejemplos y deben reemplazarse por la configuración de cada integrante.

**El archivo `local-development.json` no debe subirse a GitHub.**

### 3.5. Configurar PostgreSQL

Crear una base de datos denominada:

```text
stride_co
```

Se debe configurar un usuario de PostgreSQL con permisos sobre la base de datos.

Los valores generales de conexión se encuentran en `config/default.json`.

La configuración predeterminada utiliza:

| Propiedad | Valor |
|---|---|
| Host | `localhost` |
| Puerto | `5432` |
| Base de datos | `stride_co` |
| Usuario | `stride` |

La contraseña se mantiene exclusivamente en la configuración privada.

### 3.6. Configurar MongoDB

Se puede utilizar MongoDB local o MongoDB Atlas.

Para MongoDB local, el ejemplo de conexión es:

```text
mongodb://127.0.0.1:27017/stride_co
```

Para Atlas, se debe utilizar la URI proporcionada por el clúster.

La URI se configura en `database.mongo.uri` dentro del archivo privado del entorno correspondiente.

### 3.7. Ejecutar la aplicación

Para iniciar el servidor:

```bash
npm start
```

La configuración de desarrollo utiliza el puerto `3000` por defecto.

URL local:

```text
http://localhost:3000
```

Para desarrollo con reinicio automático:

```bash
npm run dev
```

### 3.8. Comprobar el servidor

Ejecutar:

```bash
curl http://localhost:3000/health
```

Respuesta esperada:

```json
{
  "status": "UP"
}
```

### 3.9. Ejecutar el seed

El proyecto dispone de un script para preparar datos iniciales.

```bash
npm run seed
```

El archivo `scripts/seed.js` crea o prepara:

- Roles ADMIN, SALES y USER.
- Permisos y relaciones entre roles.
- Usuarios de demostración.
- Productos de prueba.
- Variantes de productos.
- Registros de inventario.
- Clientes.
- Órdenes de ejemplo.

El script utiliza operaciones como `findOrCreate` para evitar duplicar determinados registros.

**Importante:** si un usuario ya existe, el seed no reemplaza necesariamente su contraseña. Antes de ejecutarlo sobre una base de datos compartida, se recomienda revisar su contenido y respaldar la información importante.

---

## 4. Configuración y secretos

La configuración utiliza la biblioteca `config`, versión 4, compatible con la estructura CommonJS y Node.js 22 del proyecto.

### 4.1. Entornos disponibles

| Entorno | Uso |
|---|---|
| `development` | Desarrollo local |
| `test` | Pruebas automatizadas |
| `production` | Despliegue en Render |

El entorno se selecciona mediante `NODE_ENV`.

### 4.2. Archivos de configuración

```text
config/
├── default.json
├── development.json
├── production.json
├── test.json
├── custom-environment-variables.json
├── local-development.example.json
├── local-development.json
└── local-production.json
```

| Archivo | Función |
|---|---|
| `default.json` | Valores generales |
| `development.json` | Configuración pública de desarrollo |
| `production.json` | Configuración pública de producción |
| `test.json` | Configuración de pruebas |
| `custom-environment-variables.json` | Mapeo de variables de entorno |
| `local-development.example.json` | Plantilla sin secretos reales |
| `local-development.json` | Secretos locales |
| `local-production.json` | Secretos de producción |

Los dos últimos archivos deben permanecer fuera del repositorio.

### 4.3. Variables de entorno

El proyecto utiliza principalmente:

**`NODE_ENV`**

Define el entorno de ejecución:

```text
development
test
production
```

**`PORT`**

Determina el puerto en el que escucha el servidor.

La variable `PORT` se relaciona con `server.port` mediante:

```text
config/custom-environment-variables.json
```

Las demás propiedades de configuración se leen mediante `config.get()`.

### 4.4. Configuración de producción

La configuración privada de producción tiene una estructura semejante a:

```json
{
  "jwt": {
    "secret": "CLAVE_JWT_PRIVADA"
  },
  "database": {
    "postgres": {
      "url": "INTERNAL_DATABASE_URL",
      "ssl": false
    },
    "mongo": {
      "uri": "URI_PRIVADA_DE_MONGODB_ATLAS"
    }
  }
}
```

Los valores deben sustituirse por las credenciales privadas del entorno.

No se deben publicar contraseñas, URIs ni claves JWT.

### 4.5. Secret Files de Render

Para el despliegue se utiliza la función Secret Files de Render.

Ruta del panel:

```text
Web Service → Environment → Secret Files
```

Se agrega el archivo:

```text
local-production.json
```

Render lo coloca dentro del contenedor en:

```text
/etc/secrets/local-production.json
```

La configuración del Dockerfile permite que el archivo esté disponible para `node-config`.

De esta manera, los secretos no quedan incluidos dentro del repositorio ni de la imagen Docker.

### 4.6. Conexiones SSL/TLS

Para acceder a PostgreSQL desde una computadora externa a Render se utiliza la **External Database URL** con una conexión TLS.

Para las conexiones entre servicios de Render dentro de la misma región y red privada se utiliza la **Internal Database URL**, con la configuración correspondiente al servicio.

---

## 5. Documentación de la API REST

**URL base:**

https://proyectodesarrollo-1.onrender.com

El backend proporciona rutas para ocho recursos principales.

Las rutas protegidas requieren el encabezado:

```http
Authorization: Bearer TOKEN_JWT
```

### 5.1. Rutas públicas y autenticación

| Método | Endpoint | Descripción | Autorización |
|---|---|---|---|
| GET | `/` | Página principal | Pública |
| GET | `/health` | Estado del servidor | Pública |
| POST | `/api/auth/login` | Inicio de sesión | Pública |
| GET | `/api/auth/me` | Información del usuario autenticado | JWT |

### 5.2. Usuarios

| Método | Endpoint | Descripción | Permiso RBAC |
|---|---|---|---|
| POST | `/api/users` | Crear usuario | `users:create:any` |
| GET | `/api/users` | Listar usuarios | `users:read:any` |
| GET | `/api/users/:id` | Consultar usuario | `users:read:any` |
| PUT | `/api/users/:id` | Actualizar usuario | `users:update:any` |
| DELETE | `/api/users/:id` | Eliminar usuario | `users:delete:any` |

### 5.3. Roles

| Método | Endpoint | Descripción | Permiso RBAC |
|---|---|---|---|
| POST | `/api/roles` | Crear rol | `roles:create:any` |
| GET | `/api/roles` | Listar roles | `roles:read:any` |
| GET | `/api/roles/:id` | Consultar rol | `roles:read:any` |
| PUT | `/api/roles/:id` | Actualizar rol | `roles:update:any` |
| DELETE | `/api/roles/:id` | Eliminar rol | `roles:delete:any` |

### 5.4. Permisos

| Método | Endpoint | Descripción | Permiso RBAC |
|---|---|---|---|
| POST | `/api/permissions` | Crear permiso | `permissions:create:any` |
| GET | `/api/permissions` | Listar permisos | `permissions:read:any` |
| GET | `/api/permissions/:id` | Consultar permiso | `permissions:read:any` |
| PUT | `/api/permissions/:id` | Actualizar permiso | `permissions:update:any` |
| DELETE | `/api/permissions/:id` | Eliminar permiso | `permissions:delete:any` |

### 5.5. Productos

| Método | Endpoint | Descripción | Permiso RBAC |
|---|---|---|---|
| POST | `/api/products` | Crear producto | `products:create:any` |
| GET | `/api/products` | Listar productos | `products:read:any` |
| GET | `/api/products/:id` | Consultar producto | `products:read:any` |
| PUT | `/api/products/:id` | Actualizar producto | `products:update:any` |
| DELETE | `/api/products/:id` | Eliminar producto | `products:delete:any` |

### 5.6. Variantes

| Método | Endpoint | Descripción | Permiso RBAC |
|---|---|---|---|
| POST | `/api/variants` | Crear variante | `variants:create:any` |
| GET | `/api/variants` | Listar variantes | `variants:read:any` |
| GET | `/api/variants/:id` | Consultar variante | `variants:read:any` |
| PUT | `/api/variants/:id` | Actualizar variante | `variants:update:any` |
| DELETE | `/api/variants/:id` | Eliminar variante | `variants:delete:any` |

### 5.7. Inventario

| Método | Endpoint | Descripción | Permiso RBAC |
|---|---|---|---|
| POST | `/api/inventory` | Crear inventario | `inventory:create:any` |
| GET | `/api/inventory` | Listar inventario | `inventory:read:any` |
| GET | `/api/inventory/:id` | Consultar inventario | `inventory:read:any` |
| PUT | `/api/inventory/:id` | Actualizar inventario | `inventory:update:any` |
| DELETE | `/api/inventory/:id` | Eliminar inventario | `inventory:delete:any` |

### 5.8. Clientes

| Método | Endpoint | Descripción | Permiso RBAC |
|---|---|---|---|
| POST | `/api/customers` | Crear cliente | `customers:create:any` |
| GET | `/api/customers` | Listar clientes | `customers:read:own` o `customers:read:any` |
| GET | `/api/customers/:id` | Consultar cliente | `customers:read:own` o `customers:read:any` |
| PUT | `/api/customers/:id` | Actualizar cliente | `customers:update:any` |
| DELETE | `/api/customers/:id` | Eliminar cliente | `customers:delete:any` |

Las consultas con alcance `own` deben verificar que el cliente solicitado corresponda al usuario autenticado.

### 5.9. Órdenes

| Método | Endpoint | Descripción | Permiso RBAC |
|---|---|---|---|
| POST | `/api/orders` | Crear orden | `orders:create:own` o `orders:create:any` |
| GET | `/api/orders` | Listar todas las órdenes | `orders:read:any` |
| GET | `/api/orders/own` | Listar órdenes propias | `orders:read:own` |
| GET | `/api/orders/:id` | Consultar orden | `orders:read:own` o `orders:read:any` |
| PUT | `/api/orders/:id` | Actualizar orden | `orders:update:own` o `orders:update:any` |
| DELETE | `/api/orders/:id` | Eliminar orden | `orders:delete:own` o `orders:delete:any` |

La ruta `/api/orders/own` permite que los usuarios con permiso `read:own` consulten únicamente sus órdenes.

La operación DELETE depende de los permisos asignados al rol. Actualmente el seed otorga `orders:delete:any` al administrador, pero no otorga eliminación de órdenes al usuario general.

### 5.10. Formato de respuestas

Las respuestas de la API utilizan la estructura:

```json
{
  "message": "Mensaje traducido",
  "data": {}
}
```

El contenido de `data` depende de la operación realizada.

### 5.11. Códigos HTTP

| Código | Significado |
|---|---|
| `200` | Solicitud procesada correctamente |
| `201` | Recurso creado |
| `400` | Solicitud o datos inválidos |
| `401` | Token faltante, inválido o expirado |
| `403` | Usuario sin permisos |
| `404` | Recurso inexistente |
| `500` | Error interno |

Los controladores deben evitar devolver información sensible como contraseñas, hashes y claves privadas.

---

## 6. Autenticación JWT

El sistema utiliza JSON Web Tokens para identificar a los usuarios que realizan solicitudes a las rutas protegidas.

### 6.1. Inicio de sesión

Endpoint:

```http
POST /api/auth/login
```

Ejemplo:

```bash
curl -X POST "https://proyectodesarrollo-1.onrender.com/api/auth/login" -H "Content-Type: application/json" -H "Accept-Language: es" -d '{"email":"admin@strideco.test","password":"Admin123!"}'
```

Ejemplo de respuesta:

```json
{
  "message": "Inicio de sesión exitoso",
  "data": {
    "token": "TOKEN_GENERADO",
    "tokenType": "Bearer",
    "expiresIn": "15m"
  }
}
```

El token contiene la información necesaria para identificar al usuario y validar su autenticación.

### 6.2. Consultar un recurso protegido

```bash
curl "https://proyectodesarrollo-1.onrender.com/api/products?lang=es" -H "Authorization: Bearer TOKEN_GENERADO"
```

El token se envía mediante el esquema `Bearer`.

### 6.3. Duración del token

La configuración establece:

```text
15 minutos
```

Los tokens expirados o inválidos deben ser rechazados con una respuesta HTTP 401.

### 6.4. Datos sensibles

Las respuestas de autenticación no deben incluir:

```text
password
password_hash
salt_key
jwt.secret
```

Estas verificaciones forman parte de las pruebas automatizadas.

---

## 7. Control de acceso basado en roles (RBAC)

El backend utiliza autorización basada en roles mediante AccessControl.

Los permisos se almacenan en PostgreSQL y se relacionan con los roles mediante la entidad intermedia `RolePermission`.

### 7.1. Convención de permisos

Los permisos siguen el formato:

```text
recurso:accion:alcance
```

Ejemplos:

```text
products:read:any
products:delete:any
orders:read:own
orders:read:any
```

Las acciones disponibles son:

```text
create
read
update
delete
```

### 7.2. Alcances

**`own`:** permite operar sobre recursos pertenecientes al usuario autenticado.

**`any`:** permite operar sobre los recursos autorizados sin limitarse a su propietario.

El middleware reutilizable `authorize` evalúa los permisos asociados al rol del usuario.

### 7.3. Roles utilizados

El seed define tres roles:

| Rol | Descripción |
|---|---|
| ADMIN | Administrador del sistema |
| SALES | Personal de ventas |
| USER | Cliente del sistema |

### 7.4. Matriz RBAC

La siguiente matriz corresponde a las asignaciones declaradas en `scripts/seed.js`.

| Recurso | ADMIN | SALES | USER |
|---|---|---|---|
| Users | CRUD any | Sin acceso | Sin acceso |
| Roles | CRUD any | Sin acceso | Sin acceso |
| Permissions | CRUD any | Sin acceso | Sin acceso |
| Products | CRUD any | Read any | Read any |
| Variants | CRUD any | Read any | Read any |
| Inventory | CRUD any | Read y Update any | Read any |
| Customers | CRUD any | Read y Update any | Read own |
| Orders | CRUD any | Create, Read y Update any | Create, Read y Update own |

**ADMIN:** tiene permisos CRUD sobre todos los recursos.

**SALES:** puede consultar productos y variantes, administrar determinadas operaciones de inventario y clientes, y crear, consultar y actualizar órdenes.

**USER:** puede consultar el catálogo y realizar operaciones permitidas sobre sus propios recursos.

### 7.5. Obtención de permisos

Los permisos se obtienen desde la base de datos mediante las relaciones:

```text
Role
  |
  v
RolePermission
  |
  v
Permission
```

Los permisos se crean y asignan mediante el script de seed.

No se depende únicamente de comprobar el nombre del rol dentro de cada controlador.

### 7.6. Pruebas RBAC realizadas

Se realizaron pruebas contra la API desplegada en Render.

| Solicitud | Resultado |
|---|---|
| GET `/api/products` sin token | 401 Unauthorized |
| GET `/api/products` con SALES | 200 OK |
| GET `/api/users` con SALES | 403 Forbidden |

Ejemplo de respuesta sin token:

```json
{
  "message": "Se requiere un token de autenticación",
  "data": null
}
```

Ejemplo de respuesta sin permisos:

```json
{
  "message": "Acceso denegado",
  "data": null
}
```

Las pruebas automatizadas también incluyen escenarios de administración, ventas y acceso a órdenes propias y ajenas.

---

## 8. Internacionalización (i18n)

El sistema implementa internacionalización utilizando la biblioteca `i18n`.

Los idiomas disponibles son:

| Idioma | Código |
|---|---|
| Español | `es` |
| Inglés | `en` |

Las traducciones se almacenan en:

```text
locales/
├── es.json
└── en.json
```

### 8.1. Selección de idioma

La prioridad de selección es:

1. Parámetro `?lang`.
2. Encabezado `Accept-Language`.
3. Idioma predeterminado, español.

### 8.2. Solicitudes en español

```http
GET /api/products?lang=es
```

Mensaje comprobado:

```json
{
  "message": "Productos obtenidos correctamente",
  "data": []
}
```

### 8.3. Solicitudes en inglés

```http
GET /api/products?lang=en
```

Mensaje comprobado:

```json
{
  "message": "Products retrieved successfully",
  "data": []
}
```

Los arreglos vacíos de los ejemplos son ilustrativos. Los datos reales dependen del contenido de la base de datos.

### 8.4. Variantes regionales

La aplicación acepta variantes regionales y las relaciona con el idioma base.

Ejemplo:

```http
GET /api/products?lang=es-MX
```

La respuesta se genera en español.

### 8.5. Idiomas no soportados

Si se solicita un idioma que no se encuentra disponible, la aplicación utiliza español.

Ejemplo:

```http
GET /api/products?lang=fr
```

La respuesta comprobada utiliza:

```text
Productos obtenidos correctamente
```

### 8.6. Prioridad de idioma

Se comprobó la siguiente solicitud:

```http
GET /api/products?lang=es
Accept-Language: en
```

El servidor respondió en español, confirmando que `?lang` tiene prioridad.

### 8.7. Pruebas realizadas

| Escenario | Resultado |
|---|---|
| `?lang=es` | Español |
| `?lang=en` | Inglés |
| `?lang=es-MX` | Español |
| `Accept-Language: en` | Inglés |
| `?lang=es` con encabezado inglés | Español |
| `?lang=fr` | Español predeterminado |

Los escenarios anteriores respondieron HTTP 200 durante las comprobaciones manuales.

### 8.8. Pruebas de paridad de traducciones

El archivo:

```text
test/i18n-paridad.test.js
```

comprueba que:

- Los archivos de español e inglés tengan las mismas claves.
- Las traducciones no estén vacías.

Para ejecutar esta prueba:

```bash
npx jest --runInBand test/i18n-paridad.test.js
```

### 8.9. Agregar un nuevo idioma

Para incorporar un idioma adicional se debe crear un archivo JSON en `locales/`, utilizar las mismas claves existentes, registrarlo en la configuración i18n y ampliar las pruebas automatizadas.

---

## 9. API pública y despliegue

### 9.1. URL pública

La aplicación se encuentra desplegada en:

https://proyectodesarrollo-1.onrender.com

Health Check:

https://proyectodesarrollo-1.onrender.com/health

Método:

```http
GET /health
```

Respuesta esperada:

```json
{
  "status": "UP"
}
```

### 9.2. Render Web Service

| Dato | Información |
|---|---|
| Plataforma | Render |
| Tipo | Web Service |
| Ejecución | Docker |
| Node.js | 22 |
| Rama | `staging` |
| Entorno | `production` |
| Health Check Path | `/health` |
| Puerto | Asignado por Render |

El servicio utiliza el Dockerfile incluido en el repositorio.

### 9.3. PostgreSQL de Render

| Campo | Información |
|---|---|
| Servicio | Render PostgreSQL |
| Región | Oregon (US West) |
| Fecha de creación | 03/11/2026 |
| Plan | Free |
| ORM | Sequelize |

PostgreSQL almacena la información de usuarios, roles, permisos, productos, variantes e inventario.

La conexión del Web Service utiliza la dirección interna de PostgreSQL y las credenciales configuradas de manera privada.

Para ejecutar el seed desde una computadora externa se utiliza la dirección externa de la base de datos y una conexión TLS configurada correctamente.

**Vigencia:** el plan gratuito de Render PostgreSQL tiene una duración limitada. Es necesario comprobar que la base esté activa durante la evaluación.

### 9.4. MongoDB Atlas

| Campo | Información |
|---|---|
| Clúster | `Cluster0` |
| Proveedor | AWS |
| Región | Oregon, `us-west-2` |
| Plan | Free |
| ODM | Mongoose |
| Network Access | `0.0.0.0/0` |

El clúster se utiliza para almacenar clientes y órdenes.

Debido a que Render no proporciona una IP de salida fija en todos sus planes, se configuró Network Access para permitir conexiones desde `0.0.0.0/0`.

Por seguridad, se utiliza un usuario exclusivo para la aplicación, una contraseña privada y una URI que no se almacena públicamente.

### 9.5. Usuarios de demostración

El seed crea los siguientes usuarios ficticios:

| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | `admin@strideco.test` | `Admin123!` |
| SALES | `ventas@strideco.test` | `Ventas123!` |
| USER | `usuario@strideco.test` | `Usuario123!` |

Estas credenciales se utilizan únicamente en el entorno académico y no deben reutilizarse en otros servicios.

### 9.6. Ejemplo de login

```bash
curl -X POST "https://proyectodesarrollo-1.onrender.com/api/auth/login" -H "Content-Type: application/json" -H "Accept-Language: es" -d '{"email":"admin@strideco.test","password":"Admin123!"}'
```

Respuesta de ejemplo:

```json
{
  "message": "Inicio de sesión exitoso",
  "data": {
    "token": "TOKEN_JWT",
    "tokenType": "Bearer",
    "expiresIn": "15m"
  }
}
```

### 9.7. Ejemplo de recurso autorizado

```bash
curl "https://proyectodesarrollo-1.onrender.com/api/products?lang=es" -H "Authorization: Bearer TOKEN_JWT"
```

Un usuario autorizado recibe los datos del catálogo.

### 9.8. Ejemplo de recurso denegado

Un usuario SALES no tiene permiso para consultar todos los usuarios.

```bash
curl "https://proyectodesarrollo-1.onrender.com/api/users?lang=es" -H "Authorization: Bearer TOKEN_SALES"
```

Respuesta comprobada:

```json
{
  "message": "Acceso denegado",
  "data": null
}
```

Código HTTP:

```text
403 Forbidden
```

---

## 10. Pruebas automatizadas

El proyecto incluye pruebas con Jest y Supertest, además del análisis estático con ESLint.

Se utilizan dos grupos de pruebas: pruebas con mocks y pruebas E2E.

### 10.1. ESLint

Ejecutar:

```bash
npm run lint
```

Este comando ejecuta:

```text
eslint .
```

Durante las comprobaciones locales compartidas, el análisis terminó sin errores.

### 10.2. Pruebas con mocks

Ejecutar:

```bash
npm test
```

El comando ejecuta Jest y excluye las pruebas de `test/e2e/`.

Estas pruebas no necesitan bases de datos reales ni credenciales de producción.

Se utilizan mocks para simular las dependencias y verificar el comportamiento de rutas, controladores y middlewares.

La cobertura incluye:

- Usuarios.
- Roles.
- Permisos.
- Productos.
- Variantes.
- Inventario.
- Clientes.
- Órdenes.
- Autenticación.
- Autorización.
- Validaciones.
- Internacionalización.
- Configuración.

### Resultado documentado

La última ejecución completa registrada en la documentación del equipo reporta:

```text
Test Suites: 15 passed, 15 total
Tests:       293 passed, 293 total
Snapshots:   0 total
```

Estas cifras corresponden al resultado documentado por el equipo; deberán actualizarse si la ejecución final de `staging` produce cantidades diferentes.

Para ejecutar un archivo específico:

```bash
npx jest --runInBand test/roles.test.js
```

### 10.3. Pruebas E2E

Las pruebas end-to-end se ejecutan contra la API en funcionamiento y utilizan las bases de datos reales.

Se encuentran en:

```text
test/e2e/
├── setup-env.js
├── helpers.js
├── health.e2e.test.js
├── auth.e2e.test.js
├── rbac.e2e.test.js
├── i18n.e2e.test.js
├── users.e2e.test.js
├── roles.e2e.test.js
├── permissions.e2e.test.js
├── products.e2e.test.js
├── variants.e2e.test.js
├── inventory.e2e.test.js
├── customers.e2e.test.js
└── orders.e2e.test.js
```

La suite incluye casos para:

- Health Check público.
- Login correcto e incorrecto.
- JWT ausente, inválido o expirado.
- Permisos RBAC.
- Operaciones CRUD de los ocho recursos.
- Validaciones y errores 400.
- Recursos inexistentes y errores 404.
- Relaciones entre modelos.
- Traducciones.
- Protección de datos sensibles.

Las pruebas que crean registros deben limpiarlos al finalizar para permitir nuevas ejecuciones.

### 10.4. Ejecutar E2E localmente

Primero iniciar la API con sus bases de datos configuradas:

```bash
npm start
```

En otra terminal ejecutar:

```bash
npm run test:e2e
```

La configuración local utiliza `http://localhost:3000` como URL predeterminada.

### 10.5. Ejecutar E2E contra Render

El runner admite la variable `E2E_BASE_URL`.

En Git Bash:

```bash
E2E_BASE_URL=https://proyectodesarrollo-1.onrender.com npm run test:e2e
```

En PowerShell:

```powershell
$env:E2E_BASE_URL="https://proyectodesarrollo-1.onrender.com"
npm run test:e2e
```

El runner utiliza Supertest para enviar solicitudes a la API publicada.

La prueba de token expirado puede omitirse al ejecutarse contra Render cuando requiere acceso al secreto de firma. Esta condición se identifica como una prueba omitida y no como aprobada.

Antes de ejecutar las pruebas sobre producción, debe verificarse que los casos de CRUD limpien correctamente los datos ficticios creados.

### 10.6. Evidencias E2E

El repositorio incluye una captura de una ejecución contra Render:

![Evidencia de ejecución E2E contra Render](docs/img/image.png)

Esta captura corresponde a una ejecución anterior registrada por el equipo. Para acreditar la cobertura de todas las suites de la versión final, debe utilizarse una captura actualizada de la ejecución completa.

La evidencia de generación de las pruebas con Google Antigravity y su revisión se encuentra en:

[Documentación de Google Antigravity](docs/e2e-antigravity.md)

Este documento contiene los prompts utilizados y las correcciones realizadas por el equipo.

### 10.7. Diferencia entre las pruebas

| Característica | Jest con mocks | Jest E2E |
|---|---|---|
| Comando | `npm test` | `npm run test:e2e` |
| Base de datos real | No | Sí |
| API en ejecución | No necesariamente | Sí |
| Uso de mocks | Sí | No |
| Validación de integración | Parcial | Completa |
| Pruebas desde Render | No requerido | Compatible |

---

## 11. Despliegue con Docker y Render

La API utiliza Docker para mantener un entorno de ejecución reproducible.

### 11.1. Configuración general

| Propiedad | Valor |
|---|---|
| Repositorio | `CarlosGlezCar/ProyectoDesarrollo` |
| Rama | `staging` |
| Runtime | Docker |
| Node.js | 22 |
| Entorno | `production` |
| Puerto | Proporcionado por Render |
| Health Check | `/health` |

### 11.2. Procedimiento de despliegue

1. Crear el Web Service en Render.
2. Conectar el repositorio de GitHub.
3. Seleccionar la rama `staging`.
4. Utilizar el Dockerfile del proyecto.
5. Establecer `NODE_ENV=production`.
6. Crear PostgreSQL en Render.
7. Configurar MongoDB Atlas.
8. Registrar el archivo de secretos `local-production.json`.
9. Configurar `/health` como Health Check Path.
10. Desplegar y verificar los logs.
11. Ejecutar el seed contra las bases de producción.
12. Comprobar login, JWT, RBAC e internacionalización.

### 11.3. Resultado de arranque comprobado

Durante las pruebas de despliegue se obtuvieron los siguientes mensajes:

```text
Conectando a MongoDB...
MongoDB Atlas conectado correctamente
MongoDB conectado
URL de PostgreSQL configurada: true
Conectando a PostgreSQL...
PostgreSQL conectado
Sincronizando tablas...
Tablas sincronizadas
Servidor escuchando en puerto 10000
```

Esto confirmó que el servidor pudo iniciar, conectarse a ambas bases de datos y sincronizar los modelos SQL.

Posteriormente se realizaron solicitudes públicas a Render que comprobaron el login y las respuestas de productos con autenticación y diferentes idiomas.

### 11.4. Consideraciones de los planes gratuitos

El Web Service gratuito de Render puede suspenderse después de un periodo de inactividad. La primera solicitud puede tardar mientras el servicio vuelve a iniciarse.

PostgreSQL gratuito tiene una vigencia limitada. La base debe estar activa al momento de la evaluación.

MongoDB Atlas utiliza el plan gratuito, que tiene límites de almacenamiento y recursos.

Para evitar problemas en la entrega, se recomienda comprobar la disponibilidad de `/health` y las bases de datos antes de ejecutar las pruebas finales.

---

## 12. Flujo de trabajo y control de versiones

El proyecto utiliza Git y GitHub para organizar el trabajo colaborativo.

La rama principal de evaluación es:

```text
staging
```

Se utilizaron ramas de trabajo para separar las funcionalidades:

```text
main / master
       |
       v
     staging
       |
       +-- feat/orm-odm-routes
       +-- feat/config
       +-- feat/i18n
       +-- chore/render-deploy
       +-- ramas de autenticación y autorización
       +-- ramas de pruebas y documentación
```

Los cambios se integran mediante merges o Pull Requests.

Los commits siguen una convención descriptiva, por ejemplo:

```text
feat: add products CRUD
fix: correct database connection
test: add RBAC tests
docs: update README
```

Las ramas de trabajo se conservan para mostrar la colaboración de los integrantes.

---

## 13. Estado del Entregable 2

### Funcionalidades implementadas

- [x] Backend con Node.js y Express.
- [x] Migración de MySQL a PostgreSQL.
- [x] Integración de Sequelize.
- [x] Integración de Mongoose y MongoDB.
- [x] Modelos relacionales y documentales.
- [x] Rutas CRUD de usuarios.
- [x] Rutas CRUD de roles.
- [x] Rutas CRUD de permisos.
- [x] Rutas CRUD de productos.
- [x] Rutas CRUD de variantes.
- [x] Rutas CRUD de inventario.
- [x] Rutas CRUD de clientes.
- [x] Rutas CRUD de órdenes.
- [x] Autenticación JWT.
- [x] Autorización RBAC.
- [x] Permisos con alcances `own` y `any`.
- [x] Seed de roles, permisos y datos ficticios.
- [x] Internacionalización en español e inglés.
- [x] Soporte de variantes regionales.
- [x] Fallback de idiomas no soportados.
- [x] Configuración mediante `node-config`.
- [x] Separación de secretos por entorno.
- [x] Despliegue Docker en Render.
- [x] Conexión con PostgreSQL de Render.
- [x] Conexión con MongoDB Atlas.
- [x] Pruebas con Jest y Supertest.
- [x] Suite de pruebas E2E integrada.
- [x] Script `npm run test:e2e`.
- [x] Documentación del uso de Antigravity.
- [x] Documentación de la API pública.
- [x] Documentación de la infraestructura.

### Verificación final de la entrega

Antes de enviar la URL del repositorio, el equipo debe comprobar sobre el último commit de `staging` que:

- [ ] `npm run lint` finaliza sin errores.
- [ ] `npm test` finaliza sin errores.
- [ ] `npm run test:e2e` finaliza con los resultados esperados.
- [ ] La evidencia E2E corresponde a las suites de la versión final.
- [ ] La documentación y las capturas están correctamente enlazadas.
- [ ] Render ejecuta el último commit de `staging`.
- [ ] PostgreSQL y MongoDB están activos.
- [ ] `/health` responde HTTP 200.

Estas comprobaciones distinguen las funcionalidades implementadas de su validación final.

---

## 14. Referencias

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Sequelize](https://sequelize.org/)
- [Mongoose](https://mongoosejs.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [AccessControl](https://www.npmjs.com/package/accesscontrol)
- [i18n](https://www.npmjs.com/package/i18n)
- [Node-config](https://github.com/node-config/node-config)
- [Jest](https://jestjs.io/)
- [Supertest](https://www.npmjs.com/package/supertest)
- [Render](https://render.com/docs)
- [Docker](https://docs.docker.com/)
- [Google Antigravity](https://antigravity.google/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Universidad Autónoma de Chihuahua**  
**Desarrollo de Aplicaciones Web**  
**Proyecto Integrador — Entregable 2**  
**Stride & Co.**
