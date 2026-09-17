create database FonoTrack default character set utf8mb4;

use FonoTrack;
-- PLANES
CREATE TABLE Planes (
  id_plan INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  precio INT NOT NULL,
  duracion_dias INT NOT NULL,
  PRIMARY KEY (id_plan)
);

-- USUARIOS
CREATE TABLE Usuarios (
  id_usuario INT NOT NULL AUTO_INCREMENT,
  email VARCHAR(100) NOT NULL UNIQUE,
  contrasena VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario)
);
-- FONOS
CREATE TABLE Fonoaudiologos (
  id_fonoaudiologo INT NOT NULL AUTO_INCREMENT,
  id_usuario INT NOT NULL,
  nombre_completo VARCHAR(100) NOT NULL,
  rut VARCHAR(15) NOT NULL UNIQUE,
  subespecialidad VARCHAR(100),
  acerca_de_mi TEXT,
  PRIMARY KEY (id_fonoaudiologo),
  FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
);
-- UBICACIÓN (Comunas/Regiones)
CREATE TABLE Ubicacion (
  id_ubicacion INT NOT NULL AUTO_INCREMENT,
  comuna VARCHAR(100) NOT NULL,
  PRIMARY KEY (id_ubicacion)
);

-- PACIENTES (Depende de Usuario y de Ubicación)
CREATE TABLE Pacientes (
  id_paciente INT NOT NULL AUTO_INCREMENT,
  id_usuario INT NOT NULL,
  id_ubicacion INT,
  nombre_completo VARCHAR(100) NOT NULL,
  nombre_tutor VARCHAR(100), -- Vital para pacientes menores de edad
  rut VARCHAR(15) NOT NULL UNIQUE,
  fecha_nacimiento DATE NOT NULL,
  telefono VARCHAR(20),
  PRIMARY KEY (id_paciente),
  FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario),
  FOREIGN KEY (id_ubicacion) REFERENCES Ubicacion(id_ubicacion)
);

-- SERVICIOS (Tipos de atención que ofrece el fonoaudiólogo)
CREATE TABLE Servicios (
  id_servicios INT NOT NULL AUTO_INCREMENT,
  id_fonoaudiologo INT NOT NULL,
  nombre_servicio VARCHAR(100) NOT NULL,
  precio INT NOT NULL,
  PRIMARY KEY (id_servicios),
  FOREIGN KEY (id_fonoaudiologo) REFERENCES Fonoaudiologos(id_fonoaudiologo)
);

-- DISPONIBILDAD (Horarios de atención)
CREATE TABLE Disponibilidad (
  id_disponibilidad INT NOT NULL AUTO_INCREMENT,
  id_fonoaudiologo INT NOT NULL,
  dia_semana VARCHAR(20) NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  PRIMARY KEY (id_disponibilidad),
  FOREIGN KEY (id_fonoaudiologo) REFERENCES Fonoaudiologos(id_fonoaudiologo)
);
-- CITAS (El corazón del sistema de reservas)
CREATE TABLE Citas (
  id_citas INT NOT NULL AUTO_INCREMENT,
  id_paciente INT NOT NULL,
  id_fonoaudiologo INT NOT NULL,
  id_servicio INT NOT NULL,
  id_ubicacion INT,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  duracion_minutos INT NOT NULL,
  precio INT NOT NULL,
  estado_asistencia VARCHAR(50),
  estado_pago VARCHAR(50),
  PRIMARY KEY (id_citas),
  FOREIGN KEY (id_paciente) REFERENCES Pacientes(id_paciente),
  FOREIGN KEY (id_fonoaudiologo) REFERENCES Fonoaudiologos(id_fonoaudiologo),
  FOREIGN KEY (id_servicio) REFERENCES Servicios(id_servicios),
  FOREIGN KEY (id_ubicacion) REFERENCES Ubicacion(id_ubicacion)
);

-- FICHAS (La ficha ligada a la cita de ese día)
CREATE TABLE Evoluciones_Sesion (
  id_fichas INT NOT NULL AUTO_INCREMENT,
  id_cita INT NOT NULL,
  observaciones_clinicas TEXT,
  actividades_hogar TEXT,
  PRIMARY KEY (id_fichas),
  FOREIGN KEY (id_cita) REFERENCES Citas(id_citas)
);

-- PAGOS  (Modelo SaaS: Adaptado 100% para Webpay / Transbank)
CREATE TABLE Pagos (
  id_pago INT NOT NULL AUTO_INCREMENT,
  id_fonoaudiologo INT NOT NULL,
  id_plan INT NOT NULL,
  estado_pago VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE', 
  monto_final INT NOT NULL,
  fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
  tbk_token VARCHAR(255),               -- Token de Transbank
  tbk_orden_compra VARCHAR(100),        -- Tu número de orden interno
  tbk_codigo_autorizacion VARCHAR(20),  -- Código de aprobación del banco
  PRIMARY KEY (id_pago),
  FOREIGN KEY (id_fonoaudiologo) REFERENCES Fonoaudiologos(id_fonoaudiologo),
  FOREIGN KEY (id_plan) REFERENCES Planes(id_plan)
);
