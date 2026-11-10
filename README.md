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

### 