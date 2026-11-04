-- CreateTable
CREATE TABLE `session_emotion_details` (
    `id` VARCHAR(36) NOT NULL,
    `session_emotion_id` VARCHAR(36) NOT NULL,
    `emotion_dimension_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `session_emotion_details_session_emotion_id_emotion_dimension_key`(`session_emotion_id`, `emotion_dimension_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `session_emotion_details` ADD CONSTRAINT `session_emotion_details_session_emotion_id_fkey` FOREIGN KEY (`session_emotion_id`) REFERENCES `session_emotions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_emotion_details` ADD CONSTRAINT `session_emotion_details_emotion_dimension_id_fkey` FOREIGN KEY (`emotion_dimension_id`) REFERENCES `emotion_dimensions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
