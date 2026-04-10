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
use context_system;
use local_stories\Stories;

class GetStory extends external_api {
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'id' => new external_value(PARAM_INT, 'ID истории'),
        ]);
    }

    public static function execute($id): array {
        global $DB;
        \require_capability('local/stories:view', context_system::instance());
        $params = self::validate_parameters(self::execute_parameters(), ['id' => $id]);
        $story = $DB->get_record('local_stories', ['id' => $params['id'], 'deleted' => 0], '*', MUST_EXIST);
        if ((int)$story->status !== Stories::STATUS_PUBLISHED) {
            throw new \moodle_exception('error:notpublished', 'local_stories');
        }
        $slides = $DB->get_records('local_stories_slides', ['story_id' => $story->id], 'id ASC');
        $slides_out = [];
        foreach ($slides as $slide) {
            $texts_out = [];
            if (!empty($slide->texts)) {
                $decoded = json_decode($slide->texts, true);
                if (is_array($decoded)) {
                    foreach ($decoded as $text) {
                        $texts_out[] = [
                            'text' => $text['text'] ?? '',
                            'x' => $text['x'] ?? 0,
                            'y' => $text['y'] ?? 0,
                            'color' => $text['color'] ?? '#fff',
                            'size' => $text['size'] ?? 24,
                            'align' => $text['align'] ?? 'left',
                        ];
                    }
                }
            }
            $slides_out[] = [
                'id' => $slide->id,
                'duration' => $slide->duration,
                'background' => $slide->background,
                'mediaType' => $slide->media_type,
                'mediaUrl' => $slide->media_url,
                'texts' => $texts_out,
            ];
        }
        $author = $DB->get_record('user', ['id' => $story->user_id], 'id,firstname,lastname', IGNORE_MISSING);
        return [
            'id' => $story->id,
            'title' => $story->title,
            'slides' => $slides_out,
            'author' => $author ? \fullname($author) : '',
            'date' => \userdate($story->created_at),
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'ID истории'),
            'title' => new external_value(PARAM_TEXT, 'Заголовок'),
            'slides' => new external_multiple_structure(
                new external_single_structure([
                    'id' => new external_value(PARAM_INT, 'ID слайда'),
                    'duration' => new external_value(PARAM_INT, 'Длительность'),
                    'background' => new external_value(PARAM_TEXT, 'Фон'),
                    'mediaType' => new external_value(PARAM_TEXT, 'Тип медиа'),
                    'mediaUrl' => new external_value(PARAM_TEXT, 'URL медиа'),
                    'texts' => new external_multiple_structure(
                        new external_single_structure([
                            'text' => new external_value(PARAM_TEXT, 'Текст'),
                            'x' => new external_value(PARAM_INT, 'X'),
                            'y' => new external_value(PARAM_INT, 'Y'),
                            'color' => new external_value(PARAM_TEXT, 'Цвет'),
                            'size' => new external_value(PARAM_INT, 'Размер'),
                            'align' => new external_value(PARAM_TEXT, 'Выравнивание'),
                        ])
                    ),
                ])
            ),
            'author' => new external_value(PARAM_TEXT, 'Автор'),
            'date' => new external_value(PARAM_TEXT, 'Дата создания'),
        ]);
    }
}
