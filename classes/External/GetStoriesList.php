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

class GetStoriesList extends external_api {
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    public static function execute(): array {
        global $DB;
        \require_capability('local/stories:view', context_system::instance());
        $now = time();
        $records = $DB->get_records_select(
            'local_stories',
            'status = :status AND deleted = 0 AND expires_at > :now',
            [
                'status' => Stories::STATUS_PUBLISHED,
                'now' => $now,
            ],
            'created_at DESC'
        );
        $result = [];
        foreach ($records as $story) {
            // Превью — первое изображение из первого слайда
            $slide = $DB->get_record('local_stories_slides', ['story_id' => $story->id], 'id,media_url,media_type', IGNORE_MISSING, 'id ASC');
            $preview = ($slide && $slide->media_type === 'image') ? $slide->media_url : '';
            $author = $DB->get_record('user', ['id' => $story->user_id], 'id,firstname,lastname', IGNORE_MISSING);
            $result[] = [
                'id' => $story->id,
                'title' => $story->title,
                'preview' => $preview,
                'author' => $author ? \fullname($author) : '',
                'date' => \userdate($story->created_at),
            ];
        }
        return $result;
    }

    public static function execute_returns(): external_multiple_structure {
        return new external_multiple_structure(
            new external_single_structure([
                'id' => new external_value(PARAM_INT, 'ID истории'),
                'title' => new external_value(PARAM_TEXT, 'Заголовок'),
                'preview' => new external_value(PARAM_TEXT, 'URL превью (image)'),
                'author' => new external_value(PARAM_TEXT, 'Автор'),
                'date' => new external_value(PARAM_TEXT, 'Дата создания'),
            ])
        );
    }
}
