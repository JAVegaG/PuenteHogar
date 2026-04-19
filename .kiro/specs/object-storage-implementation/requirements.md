# Documento de Requisitos — Implementación de Object Storage Real

## Introducción

Este documento define los requisitos para reemplazar los adaptadores stub de almacenamiento de objetos (MVP) con una implementación real basada en AWS S3 SDK. El sistema debe soportar la carga de fotos de propiedades (módulo `property-listings`), archivos PDF de contratos (módulo `contracts`) y, en general, cualquier archivo binario que los módulos necesiten persistir. La implementación debe respetar la arquitectura hexagonal existente, reutilizando las interfaces de puerto (`IObjectStorage`) ya definidas en cada módulo.

## Glosario

- **S3Client**: Instancia del cliente AWS S3 SDK v3 utilizada para comunicarse con el servicio de almacenamiento de objetos compatible con S3.
- **ObjectStorageAdapter**: Adaptador de infraestructura del módulo `property-listings` que implementa la interfaz `IObjectStorage` para subir fotos.
- **ContractObjectStorageAdapter**: Adaptador de infraestructura del módulo `contracts` que implementa la interfaz `IObjectStorage` para subir archivos PDF.
- **Bucket**: Contenedor lógico en S3 donde se almacenan los objetos (archivos).
- **Object_Key**: Identificador único de un objeto dentro de un bucket, compuesto por un prefijo de módulo y un nombre de archivo único.
- **MIME_Type**: Tipo de contenido del archivo (por ejemplo, `image/jpeg`, `application/pdf`, `video/mp4`).
- **Presigned_URL**: URL firmada temporalmente que permite acceso de lectura a un objeto privado en S3 sin credenciales adicionales.
- **ConfigService**: Servicio de NestJS que provee acceso tipado a las variables de configuración de la aplicación.
- **Upload_Result**: Cadena de texto que contiene la URL pública o la object key del archivo subido exitosamente.

## Requisitos

### Requisito 1: Instalación y configuración del SDK de AWS S3

**Historia de Usuario:** Como desarrollador, quiero que el proyecto incluya el AWS S3 SDK v3 como dependencia y que la configuración de conexión se lea de variables de entorno, para que los adaptadores puedan comunicarse con el servicio de almacenamiento real.

#### Criterios de Aceptación

1. THE Sistema SHALL incluir `@aws-sdk/client-s3` como dependencia de producción en `src/backend/package.json`.
2. THE ConfigService SHALL proveer las propiedades `objectStorage.bucket`, `objectStorage.endpoint` y `objectStorage.region` a partir de las variables de entorno `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ENDPOINT` y `OBJECT_STORAGE_REGION`.
3. WHEN la variable `OBJECT_STORAGE_REGION` no está definida, THE ConfigService SHALL utilizar `us-east-1` como valor por defecto.
4. WHEN la variable `OBJECT_STORAGE_ENDPOINT` está definida, THE S3Client SHALL utilizar dicho endpoint personalizado para permitir compatibilidad con servicios S3-compatible (LocalStack, MinIO).

### Requisito 2: Carga de fotos de propiedades al almacenamiento real

**Historia de Usuario:** Como arrendador, quiero que las fotos que subo al crear un anuncio se almacenen de forma persistente en un servicio de almacenamiento de objetos, para que los inquilinos puedan visualizarlas de forma confiable.

#### Criterios de Aceptación

1. WHEN el `CreateListingUseCase` invoca `uploadPhoto(fileBuffer, filename, mimeType)`, THE ObjectStorageAdapter SHALL enviar el archivo al bucket S3 configurado mediante el comando `PutObjectCommand` del SDK.
2. THE ObjectStorageAdapter SHALL generar un Object_Key con el formato `listings/{timestamp}-{uuid}-{filename}` para garantizar unicidad.
3. WHEN la carga al bucket S3 se completa exitosamente, THE ObjectStorageAdapter SHALL retornar la URL completa del objeto en formato `https://{bucket}.s3.{region}.amazonaws.com/{object_key}`.
4. THE ObjectStorageAdapter SHALL establecer el header `Content-Type` del objeto con el valor del parámetro `mimeType` recibido.
5. WHEN el parámetro `mimeType` no corresponde a un tipo de imagen válido (`image/jpeg`, `image/png`, `image/webp`), THE ObjectStorageAdapter SHALL rechazar la operación con un error descriptivo.

### Requisito 3: Carga de archivos de contratos al almacenamiento real

**Historia de Usuario:** Como arrendador, quiero que los contratos PDF que subo se almacenen de forma segura en el servicio de almacenamiento de objetos, para que estén disponibles para consulta y firma electrónica.

#### Criterios de Aceptación

1. WHEN el módulo de contratos invoca `uploadFile(fileBuffer, filename, mimeType)`, THE ContractObjectStorageAdapter SHALL enviar el archivo al bucket S3 configurado mediante el comando `PutObjectCommand` del SDK.
2. THE ContractObjectStorageAdapter SHALL generar un Object_Key con el formato `contracts/{timestamp}-{uuid}-{filename}` para garantizar unicidad.
3. WHEN la carga al bucket S3 se completa exitosamente, THE ContractObjectStorageAdapter SHALL retornar la URL completa del objeto en el mismo formato que el ObjectStorageAdapter.
4. THE ContractObjectStorageAdapter SHALL establecer el header `Content-Type` del objeto con el valor del parámetro `mimeType` recibido.
5. WHEN el parámetro `mimeType` no es `application/pdf`, THE ContractObjectStorageAdapter SHALL rechazar la operación con un error descriptivo.

### Requisito 4: Manejo de errores en la comunicación con S3

**Historia de Usuario:** Como desarrollador, quiero que los adaptadores manejen los errores de comunicación con S3 de forma predecible, para que los casos de uso puedan informar al usuario adecuadamente.

#### Criterios de Aceptación

1. IF el servicio S3 retorna un error de red o un código HTTP 5xx, THEN THE ObjectStorageAdapter SHALL lanzar una excepción con un mensaje descriptivo que incluya el nombre del archivo y el tipo de error.
2. IF el servicio S3 retorna un error de autenticación (HTTP 403), THEN THE ObjectStorageAdapter SHALL lanzar una excepción indicando un problema de configuración de credenciales.
3. IF el servicio S3 retorna un error de bucket inexistente (HTTP 404 con código `NoSuchBucket`), THEN THE ObjectStorageAdapter SHALL lanzar una excepción indicando que el bucket configurado no existe.
4. IF el parámetro `fileBuffer` está vacío (longitud cero), THEN THE ObjectStorageAdapter SHALL rechazar la operación antes de intentar la carga.
5. IF el parámetro `filename` está vacío o contiene solo espacios en blanco, THEN THE ObjectStorageAdapter SHALL rechazar la operación antes de intentar la carga.

### Requisito 5: Generación de Object Keys únicos y deterministas en estructura

**Historia de Usuario:** Como desarrollador, quiero que las claves de los objetos sigan una convención predecible y sean únicas, para facilitar la organización y evitar colisiones en el bucket.

#### Criterios de Aceptación

1. THE ObjectStorageAdapter SHALL generar Object_Keys que comiencen con el prefijo `listings/`.
2. THE ContractObjectStorageAdapter SHALL generar Object_Keys que comiencen con el prefijo `contracts/`.
3. THE Sistema SHALL incluir un componente UUID v4 en cada Object_Key generado para garantizar unicidad global.
4. FOR ALL Object_Keys generados, parsear el Object_Key y luego reconstruirlo a partir de sus componentes (prefijo, timestamp, uuid, filename) SHALL producir un valor equivalente al original (propiedad round-trip).

