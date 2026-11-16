-- CreateTable
CREATE TABLE `catalogo_servicios` (
    `id_catalogo` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_servicio` VARCHAR(100) NOT NULL,
    `publico_objetivo` VARCHAR(20) NOT NULL,

    PRIMARY KEY (`id_catalogo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `citas` (
    `id_citas` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_fonoaudiologo` INTEGER NOT NULL,
    `id_servicio` INTEGER NOT NULL,
    `id_ubicacion` INTEGER NULL,
    `fecha` DATE NOT NULL,
    `hora_inicio` TIME(0) NOT NULL,
    `duracion_minutos` INTEGER NOT NULL,
    `precio` INTEGER NOT NULL,
    `estado_asistencia` VARCHAR(50) NULL,
    `estado_pago` VARCHAR(50) NULL,

    INDEX `id_fonoaudiologo`(`id_fonoaudiologo`),
    INDEX `id_paciente`(`id_paciente`),
    INDEX `id_servicio`(`id_servicio`),
    INDEX `id_ubicacion`(`id_ubicacion`),
    PRIMARY KEY (`id_citas`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `disponibilidad` (
    `id_disponibilidad` INTEGER NOT NULL AUTO_INCREMENT,
    `id_fonoaudiologo` INTEGER NOT NULL,
    `dia_semana` VARCHAR(20) NOT NULL,
    `hora_inicio` TIME(0) NOT NULL,
    `hora_fin` TIME(0) NOT NULL,
    `id_servicio` INTEGER NOT NULL,

    INDEX `id_fonoaudiologo`(`id_fonoaudiologo`),
    INDEX `id_servicio`(`id_servicio`),
    PRIMARY KEY (`id_disponibilidad`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evoluciones_sesion` (
    `id_fichas` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cita` INTEGER NOT NULL,
    `observaciones_clinicas` TEXT NULL,
    `actividades_hogar` TEXT NULL,

    INDEX `id_cita`(`id_cita`),
    PRIMARY KEY (`id_fichas`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fonoaudiologos` (
    `id_fonoaudiologo` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `nombre_completo` VARCHAR(100) NOT NULL,
    `rut` VARCHAR(15) NOT NULL,
    `subespecialidad` VARCHAR(100) NULL,
    `publico_objetivo` VARCHAR(50) NULL DEFAULT 'Ambos',
    `acerca_de_mi` TEXT NULL,
    `foto_perfil` VARCHAR(255) NULL,
    `id_ubicacion` INTEGER NULL,
    `telefono` VARCHAR(20) NULL,

    UNIQUE INDEX `rut`(`rut`),
    INDEX `id_usuario`(`id_usuario`),
    INDEX `fk_fono_ubicacion`(`id_ubicacion`),
    PRIMARY KEY (`id_fonoaudiologo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resenas` (
    `id_resena` INTEGER NOT NULL AUTO_INCREMENT,
    `id_paciente` INTEGER NOT NULL,
    `id_fonoaudiologo` INTEGER NOT NULL,
    `calificacion` INTEGER NOT NULL,
    `comentario` TEXT NULL,
    `fecha_creacion` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_resena_fono`(`id_fonoaudiologo`),
    INDEX `idx_resena_paciente`(`id_paciente`),
    PRIMARY KEY (`id_resena`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pacientes` (
    `id_paciente` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NOT NULL,
    `id_ubicacion` INTEGER NULL,
    `nombre_completo` VARCHAR(100) NOT NULL,
    `nombre_tutor` VARCHAR(100) NULL,
    `rut` VARCHAR(15) NOT NULL,
    `fecha_nacimiento` DATE NULL,
    `telefono` VARCHAR(20) NULL,
    `genero` VARCHAR(30) NULL,

    UNIQUE INDEX `rut`(`rut`),
    INDEX `id_ubicacion`(`id_ubicacion`),
    INDEX `id_usuario`(`id_usuario`),
    PRIMARY KEY (`id_paciente`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pagos` (
    `id_pago` INTEGER NOT NULL AUTO_INCREMENT,
    `id_fonoaudiologo` INTEGER NOT NULL,
    `id_plan` INTEGER NOT NULL,
    `estado_pago` VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
    `monto_final` INTEGER NOT NULL,
    `fecha_pago` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `tbk_token` VARCHAR(255) NULL,
    `tbk_orden_compra` VARCHAR(100) NULL,
    `tbk_codigo_autorizacion` VARCHAR(20) NULL,

    INDEX `id_fonoaudiologo`(`id_fonoaudiologo`),
    INDEX `id_plan`(`id_plan`),
    PRIMARY KEY (`id_pago`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `planes` (
    `id_plan` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(50) NOT NULL,
    `precio` INTEGER NOT NULL,
    `duracion_dias` INTEGER NOT NULL,

    PRIMARY KEY (`id_plan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `servicios` (
    `id_servicios` INTEGER NOT NULL AUTO_INCREMENT,
    `id_fonoaudiologo` INTEGER NOT NULL,
    `id_catalogo` INTEGER NULL,
    `nombre_servicio` VARCHAR(100) NOT NULL,
    `precio` INTEGER NOT NULL,
    `duracion_minutos` INTEGER NOT NULL DEFAULT 50,

    INDEX `id_fonoaudiologo`(`id_fonoaudiologo`),
    INDEX `fk_servicios_catalogo`(`id_catalogo`),
    PRIMARY KEY (`id_servicios`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ubicacion` (
    `id_ubicacion` INTEGER NOT NULL AUTO_INCREMENT,
    `comuna` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`id_ubicacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id_usuario` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(100) NOT NULL,
    `contrasena` VARCHAR(255) NOT NULL,
    `rol` VARCHAR(20) NOT NULL,
    `fecha_creacion` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

