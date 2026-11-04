-- CreateTable
CREATE TABLE `emotions` (
    `key` VARCHAR(100) NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `definition` TEXT NOT NULL,
    `parent_key` VARCHAR(100) NULL,
    `ring` ENUM('core', 'mid', 'specific') NOT NULL,
    `sector_colour` VARCHAR(7) NOT NULL,
    `level_min` ENUM('child', 'adult', 'advanced') NOT NULL,
    `source` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emotion_dimensions` (
    `id` VARCHAR(36) NOT NULL,
    `emotion_key` VARCHAR(100) NOT NULL,
    `dimension` ENUM('synonyms', 'prompting_event', 'interpretation', 'biological_change', 'expression_action', 'aftereffect', 'opposite_action', 'justified_when', 'coping_strategy', 'child_language', 'what_it_does') NOT NULL,
    `content` TEXT NOT NULL,
    `level_min` ENUM('child', 'adult', 'advanced') NOT NULL,
    `source` VARCHAR(100) NOT NULL,
    `display_order` SMALLINT NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coping_suggestions` (
    `id` VARCHAR(36) NOT NULL,
    `emotion_key` VARCHAR(100) NULL,
    `suggestion` TEXT NOT NULL,
    `category` ENUM('breathing', 'grounding', 'opposite_action', 'pleasant_event', 'please_skill', 'mindfulness', 'crisis', 'values_reflection') NOT NULL,
    `level_min` ENUM('child', 'adult', 'advanced') NOT NULL,
    `source` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emotion_myths` (
    `id` VARCHAR(36) NOT NULL,
    `myth_text` TEXT NOT NULL,
    `challenge` TEXT NULL,
    `display_order` SMALLINT NOT NULL DEFAULT 0,
    `source` VARCHAR(100) NOT NULL DEFAULT 'dbt-handout-4a',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `level` ENUM('child', 'adult', 'advanced') NOT NULL,
    `mode` ENUM('general', 'incident') NOT NULL,
    `overriding_emotion` VARCHAR(100) NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `feedback_rating` TINYINT NULL,
    `feedback_text` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session_emotions` (
    `id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(36) NOT NULL,
    `ring` ENUM('core', 'mid', 'specific') NOT NULL,
    `emotion_key` VARCHAR(100) NOT NULL,
    `selected_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dwell_ms` INTEGER NULL,
    `intensity` TINYINT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session_events` (
    `id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(36) NOT NULL,
    `event_type` VARCHAR(100) NOT NULL,
    `event_data` JSON NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session_reflections` (
    `id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(36) NOT NULL,
    `emotion_key` VARCHAR(100) NOT NULL,
    `emotion_fits_facts` ENUM('yes', 'no', 'unsure') NULL,
    `action_urge` TEXT NULL,
    `opposite_taken` BOOLEAN NULL,
    `reframe_text` TEXT NULL,
    `commitment_text` TEXT NULL,
    `intensity_before` TINYINT NULL,
    `intensity_after` TINYINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feedback` (
    `id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(36) NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `rating` TINYINT NULL,
    `comment` TEXT NULL,
    `page_context` VARCHAR(100) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_insights` (
    `id` VARCHAR(36) NOT NULL,
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `scope` ENUM('global', 'session', 'cohort') NOT NULL,
    `session_id` VARCHAR(36) NULL,
    `emotion_key` VARCHAR(100) NULL,
    `insight_type` VARCHAR(100) NOT NULL,
    `insight_text` TEXT NOT NULL,
    `model_id` VARCHAR(100) NULL,
    `confidence` DECIMAL(4, 3) NULL,
    `raw_output` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emotion_embeddings` (
    `emotion_key` VARCHAR(100) NOT NULL,
    `model_id` VARCHAR(100) NOT NULL,
    `embedding` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`emotion_key`, `model_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `emotions` ADD CONSTRAINT `emotions_parent_key_fkey` FOREIGN KEY (`parent_key`) REFERENCES `emotions`(`key`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emotion_dimensions` ADD CONSTRAINT `emotion_dimensions_emotion_key_fkey` FOREIGN KEY (`emotion_key`) REFERENCES `emotions`(`key`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coping_suggestions` ADD CONSTRAINT `coping_suggestions_emotion_key_fkey` FOREIGN KEY (`emotion_key`) REFERENCES `emotions`(`key`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_emotions` ADD CONSTRAINT `session_emotions_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_emotions` ADD CONSTRAINT `session_emotions_emotion_key_fkey` FOREIGN KEY (`emotion_key`) REFERENCES `emotions`(`key`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_events` ADD CONSTRAINT `session_events_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_reflections` ADD CONSTRAINT `session_reflections_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_reflections` ADD CONSTRAINT `session_reflections_emotion_key_fkey` FOREIGN KEY (`emotion_key`) REFERENCES `emotions`(`key`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_insights` ADD CONSTRAINT `ai_insights_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_insights` ADD CONSTRAINT `ai_insights_emotion_key_fkey` FOREIGN KEY (`emotion_key`) REFERENCES `emotions`(`key`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emotion_embeddings` ADD CONSTRAINT `emotion_embeddings_emotion_key_fkey` FOREIGN KEY (`emotion_key`) REFERENCES `emotions`(`key`) ON DELETE RESTRICT ON UPDATE CASCADE;
