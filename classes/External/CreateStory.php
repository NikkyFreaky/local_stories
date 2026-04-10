<?php
declare(strict_types=1);

namespace local_stories\External;

global $CFG;
require_once($CFG->libdir . '/externallib.php');

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;
use external_multiple_structure;

class CreateStory extends external_api {
    /**
     * Описание параметров
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'title' => new external_value(PARAM_TEXT, 'Story title'),
            'course_id' => new external_value(PARAM_INT, 'Course ID', VALUE_DEFAULT, null),
            'expires_at' => new external_value(PARAM_INT, 'Expiration timestamp', VALUE_DEFAULT, null),
            'slides' => new external_multiple_structure(
                new external_single_structure([
                    'position' => new external_value(PARAM_INT, 'Slide position'),
                    'duration' => new external_value(PARAM_INT, 'Slide duration in ms', VALUE_DEFAULT, 5000),
                    'background' => new external_value(PARAM_TEXT, 'Background color', VALUE_DEFAULT, null),
                    'media_type' => new external_value(PARAM_TEXT, 'Media type (image/video)', VALUE_DEFAULT, null),
                    'media_url' => new external_value(PARAM_URL, 'Media URL', VALUE_DEFAULT, null),
                    'texts' => new external_multiple_structure(
                        new external_single_structure([
                            'text' => new external_value(PARAM_TEXT, 'Text content'),
                            'x' => new external_value(PARAM_INT, 'X position'),
                            'y' => new external_value(PARAM_INT, 'Y position'),
                            'color' => new external_value(PARAM_TEXT, 'Text color'),
                            'size' => new external_value(PARAM_INT, 'Font size'),
                            'align' => new external_value(PARAM_TEXT, 'Text alignment')
                        ]),
                        'Text elements',
                        VALUE_DEFAULT,
                        []
                    )
                ])
            )
        ]);
    }

    /**
     * Создает историю
     */
    public static function execute($title, $course_id = null, $expires_at = null, $slides = []): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'title' => $title,
            'course_id' => $course_id,
            'expires_at' => $expires_at,
            'slides' => $slides
        ]);

        // Если не передано время жизни, ставим 24 часа по умолчанию
        if (empty($params['expires_at'])) {
            $params['expires_at'] = time() + 24 * 3600;
            // $params['expires_at'] = time() + 60;
        }

        // Создаем историю
        $data = (object)[
            'title' => $params['title'],
            'course_id' => $params['course_id'],
            'expires_at' => $params['expires_at']
        ];

        $story_id = \local_stories\Stories::create($data);

        // Добавляем слайды
        foreach ($params['slides'] as $slide_data) {
            $slide = (object)[
                'story_id' => $story_id,
                'position' => $slide_data['position'],
                'duration' => $slide_data['duration'],
                'background' => $slide_data['background'],
                'media_type' => $slide_data['media_type'],
                'media_url' => $slide_data['media_url'],
                'texts' => json_encode($slide_data['texts']),
                'timecreated' => time(),
                'timemodified' => time()
            ];

            $DB->insert_record('local_stories_slides', $slide);
        }

        return [
            'id' => $story_id,
            'status' => \local_stories\Stories::STATUS_DRAFT,
        ];
    }

    /**
     * Описание возвращаемых данных
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Story ID'),
            'status' => new external_value(PARAM_INT, 'Story status'),
        ]);
    }
}
